import { v4 as uuidv4 } from 'uuid';
import db from '../../config/database.js';
import { ROLES, TRACKER_DOMAINS, WORKFLOW_STATUSES } from '../../config/env.js';
import { AppError } from '../../core/middleware/errorHandler.js';
import { auditLog } from '../../core/audit/audit.service.js';
import {
  findReviewerUserIds,
  notifyUsers
} from '../../core/notifications/notifications.service.js';
import { sendSuccess } from '../../core/utils/response.js';
import { shapeSingleTrackerAnalytics } from '../../core/utils/analyticsShape.js';
import {
  deletePrivateEvidenceFile,
  savePrivateEvidenceFile,
  streamPrivateEvidenceFile
} from '../../core/storage/privateStorage.js';
import { calculateFacultyScore } from './faculty.scoring.js';
import { resolveFacultyTransition } from './faculty.workflow.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EDITABLE_STATUSES = [WORKFLOW_STATUSES.DRAFT, WORKFLOW_STATUSES.CHANGES_REQUESTED];

const assertValidUuid = (id, label = 'achievement ID') => {
  if (!id || !UUID_REGEX.test(id)) {
    throw new AppError(400, 'INVALID_ID', `Invalid ${label} format.`);
  }
};

export async function listFacultyCategories(req, res, next) {
  try {
    const categories = await db('faculty_categories')
      .where({ is_active: true })
      .orderBy('name', 'asc');
    return sendSuccess(res, categories);
  } catch (err) {
    next(err);
  }
}

export async function listFacultyAchievements(req, res, next) {
  try {
    const {
      page,
      limit,
      owner_user_id,
      category_id,
      academic_year,
      workflow_status,
      achievement_level,
      search
    } = req.query;

    const baseQuery = db('faculty_achievements');

    if (req.user.role === ROLES.FACULTY) {
      // Faculty may ONLY view their own personal faculty achievements
      baseQuery.where('faculty_achievements.owner_user_id', req.user.id);
    } else if (req.user.role === ROLES.HOD) {
      baseQuery.where('faculty_achievements.department_id', req.user.department_id);
      if (owner_user_id) {
        baseQuery.where('faculty_achievements.owner_user_id', owner_user_id);
      }
    } else if (req.user.role === ROLES.SUPER_ADMIN) {
      if (req.departmentScope) {
        baseQuery.where('faculty_achievements.department_id', req.departmentScope);
      }
      if (owner_user_id) {
        baseQuery.where('faculty_achievements.owner_user_id', owner_user_id);
      }
    }

    if (category_id) baseQuery.where('faculty_achievements.category_id', category_id);
    if (academic_year) baseQuery.where('faculty_achievements.academic_year', academic_year);
    if (workflow_status) baseQuery.where('faculty_achievements.workflow_status', workflow_status);
    if (achievement_level) baseQuery.where('faculty_achievements.achievement_level', achievement_level);

    if (search && search.trim()) {
      const pattern = `%${search.trim().toLowerCase()}%`;
      baseQuery.where(function () {
        this.whereRaw('LOWER(faculty_achievements.title) LIKE ?', [pattern])
          .orWhereRaw('LOWER(faculty_achievements.organization) LIKE ?', [pattern])
          .orWhereRaw('LOWER(faculty_achievements.description) LIKE ?', [pattern]);
      });
    }

    const countRow = await baseQuery.clone().count('faculty_achievements.id as count').first();
    const total = parseInt(countRow?.count || 0, 10);
    const offset = (page - 1) * limit;

    const items = await baseQuery
      .clone()
      .leftJoin('faculty_categories', 'faculty_achievements.category_id', 'faculty_categories.id')
      .leftJoin('departments', 'faculty_achievements.department_id', 'departments.id')
      .leftJoin('users as owner', 'faculty_achievements.owner_user_id', 'owner.id')
      .select(
        'faculty_achievements.*',
        'faculty_categories.code as category_code',
        'faculty_categories.name as category_name',
        'departments.code as department_code',
        'departments.name as department_name',
        'owner.full_name as owner_name',
        'owner.employee_or_roll_no as owner_employee_no'
      )
      .orderBy('faculty_achievements.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    const evidenceCounts = items.length
      ? await db('faculty_evidence_documents')
          .whereIn(
            'achievement_id',
            items.map((r) => r.id)
          )
          .groupBy('achievement_id')
          .select('achievement_id')
          .count('id as count')
      : [];

    const countMap = Object.fromEntries(
      evidenceCounts.map((row) => [row.achievement_id, parseInt(row.count, 10)])
    );

    return sendSuccess(
      res,
      items.map((item) => ({
        ...item,
        evidence_count: countMap[item.id] || 0
      })),
      {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1
      }
    );
  } catch (err) {
    next(err);
  }
}

export async function getFacultyPortfolio(req, res, next) {
  try {
    const requestedUserId = req.query.userId;
    const targetUserId =
      req.user.role === ROLES.FACULTY || !requestedUserId ? req.user.id : requestedUserId;

    if (req.user.role === ROLES.FACULTY && targetUserId !== req.user.id) {
      throw new AppError(
        403,
        'OWNERSHIP_DENIED',
        'Faculty members can only view their own personal achievement portfolio.'
      );
    }

    const owner = await db('users')
      .leftJoin('departments', 'users.department_id', 'departments.id')
      .where('users.id', targetUserId)
      .select(
        'users.id',
        'users.full_name',
        'users.email',
        'users.employee_or_roll_no',
        'users.role',
        'users.department_id',
        'departments.code as department_code',
        'departments.name as department_name'
      )
      .first();

    if (!owner) {
      throw new AppError(404, 'USER_NOT_FOUND', 'Faculty user not found.');
    }

    if (req.user.role === ROLES.HOD && owner.department_id !== req.user.department_id) {
      throw new AppError(
        403,
        'DEPARTMENT_ACCESS_DENIED',
        'HODs may only inspect portfolios within their assigned department.'
      );
    }

    const query = db('faculty_achievements')
      .leftJoin('faculty_categories', 'faculty_achievements.category_id', 'faculty_categories.id')
      .where('faculty_achievements.owner_user_id', targetUserId)
      .select(
        'faculty_achievements.*',
        'faculty_categories.code as category_code',
        'faculty_categories.name as category_name'
      )
      .orderBy('faculty_achievements.achieved_on', 'desc');

    if (req.query.academic_year) {
      query.where('faculty_achievements.academic_year', req.query.academic_year);
    }

    const records = await query;

    const statusCounts = {
      total: records.length,
      approved: 0,
      college_approved: 0,
      department_approved: 0,
      under_review: 0,
      submitted: 0,
      changes_requested: 0,
      draft: 0,
      rejected: 0
    };
    let totalFacultyScore = 0;
    const categorySummaryMap = {};

    for (const row of records) {
      if (statusCounts[row.workflow_status] !== undefined) {
        statusCounts[row.workflow_status] += 1;
      }
      if (row.workflow_status === WORKFLOW_STATUSES.COLLEGE_APPROVED) {
        statusCounts.approved += 1;
        totalFacultyScore += Number(row.computed_score || 0);
      }
      const code = row.category_code || 'OTHER';
      if (!categorySummaryMap[code]) {
        categorySummaryMap[code] = {
          category_code: code,
          category_name: row.category_name || code,
          total_count: 0,
          approved_count: 0,
          approved_score: 0
        };
      }
      categorySummaryMap[code].total_count += 1;
      if (row.workflow_status === WORKFLOW_STATUSES.COLLEGE_APPROVED) {
        categorySummaryMap[code].approved_count += 1;
        categorySummaryMap[code].approved_score += Number(row.computed_score || 0);
      }
    }

    return sendSuccess(res, {
      owner,
      summary: {
        ...statusCounts,
        total_faculty_score: Number(totalFacultyScore.toFixed(2))
      },
      by_category: Object.values(categorySummaryMap),
      records
    });
  } catch (err) {
    next(err);
  }
}

export async function getFacultyAchievementById(req, res, next) {
  try {
    const { id } = req.params;
    assertValidUuid(id);

    const achievement = await db('faculty_achievements')
      .leftJoin('faculty_categories', 'faculty_achievements.category_id', 'faculty_categories.id')
      .leftJoin('departments', 'faculty_achievements.department_id', 'departments.id')
      .leftJoin('users as owner', 'faculty_achievements.owner_user_id', 'owner.id')
      .leftJoin('users as approver', 'faculty_achievements.approved_by_user_id', 'approver.id')
      .where('faculty_achievements.id', id)
      .select(
        'faculty_achievements.*',
        'faculty_categories.code as category_code',
        'faculty_categories.name as category_name',
        'departments.code as department_code',
        'departments.name as department_name',
        'owner.full_name as owner_name',
        'owner.employee_or_roll_no as owner_employee_no',
        'approver.full_name as approved_by_name'
      )
      .first();

    if (!achievement) {
      throw new AppError(404, 'ACHIEVEMENT_NOT_FOUND', 'Faculty achievement not found.');
    }

    const [approvalLogs, documents] = await Promise.all([
      db('faculty_approval_logs')
        .leftJoin('users', 'faculty_approval_logs.actor_user_id', 'users.id')
        .where('faculty_approval_logs.achievement_id', id)
        .select(
          'faculty_approval_logs.*',
          'users.full_name as actor_name',
          'users.role as actor_role'
        )
        .orderBy('faculty_approval_logs.acted_at', 'desc'),
      db('faculty_evidence_documents')
        .where({ achievement_id: id })
        .select(
          'id',
          'original_filename',
          'mime_type',
          'file_size_bytes',
          'sha256_hash',
          'uploaded_at'
        )
        .orderBy('uploaded_at', 'desc')
    ]);

    return sendSuccess(res, {
      ...achievement,
      approval_logs: approvalLogs,
      evidence_documents: documents
    });
  } catch (err) {
    next(err);
  }
}

export async function createFacultyAchievement(req, res, next) {
  try {
    const {
      category_id,
      title,
      description,
      achieved_on,
      achievement_level,
      organization,
      academic_year,
      details_json,
      collaborators_json
    } = req.body;

    const category = await db('faculty_categories')
      .where({ id: category_id, is_active: true })
      .first();
    if (!category) {
      throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Faculty achievement category not found.');
    }

    const achievementId = uuidv4();
    let created;

    await db.transaction(async (trx) => {
      const [row] = await trx('faculty_achievements')
        .insert({
          id: achievementId,
          department_id: req.user.department_id,
          owner_user_id: req.user.id,
          category_id,
          title: title.trim(),
          description: description.trim(),
          achieved_on,
          achievement_level,
          organization: organization.trim(),
          academic_year: academic_year.trim(),
          details_json: JSON.stringify(details_json || {}),
          collaborators_json: JSON.stringify(collaborators_json || []),
          workflow_status: WORKFLOW_STATUSES.DRAFT
        })
        .returning('*');
      created = row;

      await trx('faculty_approval_logs').insert({
        id: uuidv4(),
        achievement_id: achievementId,
        actor_user_id: req.user.id,
        from_status: null,
        to_status: WORKFLOW_STATUSES.DRAFT,
        remarks: 'Personal faculty achievement draft created.'
      });
    });

    auditLog({
      actorUserId: req.user.id,
      actorRole: req.user.role,
      actorDepartmentId: req.user.department_id,
      trackerDomain: TRACKER_DOMAINS.FACULTY,
      action: 'CREATE',
      entityType: 'faculty_achievement',
      entityId: created.id,
      targetDepartmentId: created.department_id,
      afterState: created,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      requestId: req.requestId
    });

    return sendSuccess(res, created, null, 201);
  } catch (err) {
    next(err);
  }
}

export async function updateFacultyAchievement(req, res, next) {
  try {
    const { id } = req.params;
    assertValidUuid(id);

    const existing = await db('faculty_achievements').where({ id }).first();
    if (!existing) {
      throw new AppError(404, 'ACHIEVEMENT_NOT_FOUND', 'Faculty achievement not found.');
    }

    if (req.user.role !== ROLES.SUPER_ADMIN && existing.owner_user_id !== req.user.id) {
      throw new AppError(
        403,
        'OWNERSHIP_DENIED',
        'Only the faculty owner may edit their personal achievement.'
      );
    }

    if (!EDITABLE_STATUSES.includes(existing.workflow_status)) {
      throw new AppError(
        409,
        'IMMUTABLE_WORKFLOW_STATE',
        `Achievements in "${existing.workflow_status}" status cannot be edited.`
      );
    }

    const updates = {};
    const {
      category_id,
      title,
      description,
      achieved_on,
      achievement_level,
      organization,
      academic_year,
      details_json,
      collaborators_json
    } = req.body;

    if (category_id !== undefined) {
      const cat = await db('faculty_categories').where({ id: category_id, is_active: true }).first();
      if (!cat) throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Faculty category not found.');
      updates.category_id = category_id;
    }
    if (title !== undefined) updates.title = title.trim();
    if (description !== undefined) updates.description = description.trim();
    if (achieved_on !== undefined) updates.achieved_on = achieved_on;
    if (achievement_level !== undefined) updates.achievement_level = achievement_level;
    if (organization !== undefined) updates.organization = organization.trim();
    if (academic_year !== undefined) updates.academic_year = academic_year.trim();
    if (details_json !== undefined) updates.details_json = JSON.stringify(details_json);
    if (collaborators_json !== undefined) {
      updates.collaborators_json = JSON.stringify(collaborators_json);
    }
    updates.updated_at = db.fn.now();

    const [updated] = await db('faculty_achievements')
      .where({ id })
      .update(updates)
      .returning('*');

    auditLog({
      actorUserId: req.user.id,
      actorRole: req.user.role,
      actorDepartmentId: req.user.department_id,
      trackerDomain: TRACKER_DOMAINS.FACULTY,
      action: 'UPDATE',
      entityType: 'faculty_achievement',
      entityId: updated.id,
      targetDepartmentId: updated.department_id,
      beforeState: existing,
      afterState: updated,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      requestId: req.requestId
    });

    return sendSuccess(res, updated);
  } catch (err) {
    next(err);
  }
}

export async function deleteFacultyAchievement(req, res, next) {
  try {
    const { id } = req.params;
    assertValidUuid(id);

    const existing = await db('faculty_achievements').where({ id }).first();
    if (!existing) {
      throw new AppError(404, 'ACHIEVEMENT_NOT_FOUND', 'Faculty achievement not found.');
    }

    if (req.user.role !== ROLES.SUPER_ADMIN && existing.owner_user_id !== req.user.id) {
      throw new AppError(
        403,
        'OWNERSHIP_DENIED',
        'Only the faculty owner may delete this draft achievement.'
      );
    }

    if (!EDITABLE_STATUSES.includes(existing.workflow_status)) {
      throw new AppError(
        409,
        'IMMUTABLE_WORKFLOW_STATE',
        'Only draft or returned achievements may be deleted.'
      );
    }

    const docs = await db('faculty_evidence_documents').where({ achievement_id: id });
    await db('faculty_achievements').where({ id }).del();
    await Promise.all(docs.map((d) => deletePrivateEvidenceFile(d.storage_object_key)));

    return sendSuccess(res, { deleted: true, id });
  } catch (err) {
    next(err);
  }
}

export async function submitFacultyAchievement(req, res, next) {
  try {
    const { id } = req.params;
    assertValidUuid(id);

    const existing = await db('faculty_achievements').where({ id }).first();
    if (!existing) {
      throw new AppError(404, 'ACHIEVEMENT_NOT_FOUND', 'Faculty achievement not found.');
    }

    if (req.user.role !== ROLES.SUPER_ADMIN && existing.owner_user_id !== req.user.id) {
      throw new AppError(
        403,
        'OWNERSHIP_DENIED',
        'Only the faculty owner may submit this achievement.'
      );
    }

    if (!EDITABLE_STATUSES.includes(existing.workflow_status)) {
      throw new AppError(
        409,
        'INVALID_TRANSITION',
        `Cannot submit achievement from "${existing.workflow_status}" status.`
      );
    }

    let updated;
    await db.transaction(async (trx) => {
      const [row] = await trx('faculty_achievements')
        .where({ id })
        .update({
          workflow_status: WORKFLOW_STATUSES.SUBMITTED,
          submitted_at: trx.fn.now(),
          updated_at: trx.fn.now()
        })
        .returning('*');
      updated = row;

      await trx('faculty_approval_logs').insert({
        id: uuidv4(),
        achievement_id: id,
        actor_user_id: req.user.id,
        actor_role: req.user.role,
        from_status: existing.workflow_status,
        to_status: WORKFLOW_STATUSES.SUBMITTED,
        remarks: 'Submitted for HOD and college verification.'
      });
    });

    const hodIds = await findReviewerUserIds({
      role: ROLES.HOD,
      departmentId: updated.department_id
    });
    const superAdminIds = await findReviewerUserIds({ role: ROLES.SUPER_ADMIN });
    const reviewerTargets = hodIds.filter((uid) => uid !== req.user.id);
    await notifyUsers({
      recipientUserIds: reviewerTargets.length > 0 ? reviewerTargets : superAdminIds,
      trackerDomain: TRACKER_DOMAINS.FACULTY,
      achievementId: id,
      title: `Faculty Submission: ${updated.title}`,
      message: `A personal faculty achievement has been submitted for verification.`,
      status: WORKFLOW_STATUSES.SUBMITTED
    });

    auditLog({
      actorUserId: req.user.id,
      actorRole: req.user.role,
      actorDepartmentId: req.user.department_id,
      trackerDomain: TRACKER_DOMAINS.FACULTY,
      action: 'SUBMIT',
      entityType: 'faculty_achievement',
      entityId: id,
      targetDepartmentId: updated.department_id,
      beforeState: existing,
      afterState: updated,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      requestId: req.requestId
    });

    return sendSuccess(res, updated);
  } catch (err) {
    next(err);
  }
}

export async function reviewFacultyAchievement(req, res, next) {
  try {
    const { id } = req.params;
    assertValidUuid(id);

    const existing = await db('faculty_achievements').where({ id }).first();
    if (!existing) {
      throw new AppError(404, 'ACHIEVEMENT_NOT_FOUND', 'Faculty achievement not found.');
    }

    const { decision, remarks, override_self_approval } = req.body;
    const transition = resolveFacultyTransition({
      actor: req.user,
      record: existing,
      decision,
      overrideSelfApproval: Boolean(override_self_approval)
    });

    let updated;

    await db.transaction(async (trx) => {
      const patch = {
        workflow_status: transition.nextStatus,
        reviewer_id: req.user.id,
        reviewed_at: trx.fn.now(),
        review_remarks: remarks ? remarks.trim() : null,
        updated_at: trx.fn.now()
      };

      if (transition.isDepartmentApproved) {
        patch.department_approved_by_user_id = req.user.id;
        patch.department_approved_at = trx.fn.now();
      }

      if (transition.isFinalVerified) {
        const { computedScore, scoringRuleVersion } = await calculateFacultyScore(existing, trx);
        patch.computed_score = computedScore;
        patch.scoring_rule_version = scoringRuleVersion;
        patch.approved_by_user_id = req.user.id;
        patch.approved_at = trx.fn.now();
      } else if (transition.clearScore) {
        patch.computed_score = null;
        patch.scoring_rule_version = null;
      }

      const [row] = await trx('faculty_achievements').where({ id }).update(patch).returning('*');
      updated = row;

      await trx('faculty_approval_logs').insert({
        id: uuidv4(),
        achievement_id: id,
        actor_user_id: req.user.id,
        actor_role: req.user.role,
        from_status: existing.workflow_status,
        to_status: transition.nextStatus,
        remarks: remarks ? remarks.trim() : `Status changed to ${transition.nextStatus}.`
      });
    });

    await notifyUsers({
      recipientUserIds: [existing.owner_user_id],
      trackerDomain: TRACKER_DOMAINS.FACULTY,
      achievementId: id,
      title: `Faculty Achievement: ${updated.title}`,
      message: `Status updated to ${transition.nextStatus.replaceAll('_', ' ')}${remarks ? ` — "${remarks.trim()}"` : ''}.`,
      status: transition.nextStatus
    });

    if (transition.nextStatus === WORKFLOW_STATUSES.DEPARTMENT_APPROVED) {
      const superAdminIds = await findReviewerUserIds({ role: ROLES.SUPER_ADMIN });
      await notifyUsers({
        recipientUserIds: superAdminIds,
        trackerDomain: TRACKER_DOMAINS.FACULTY,
        achievementId: id,
        title: `College Verification Needed: ${updated.title}`,
        message: `HOD approved faculty achievement and escalated for final college approval.`,
        status: transition.nextStatus
      });
    }

    auditLog({
      actorUserId: req.user.id,
      actorRole: req.user.role,
      actorDepartmentId: req.user.department_id,
      trackerDomain: TRACKER_DOMAINS.FACULTY,
      action: decision.toUpperCase(),
      entityType: 'faculty_achievement',
      entityId: id,
      targetDepartmentId: updated.department_id,
      beforeState: existing,
      afterState: updated,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      requestId: req.requestId
    });

    return sendSuccess(res, updated);
  } catch (err) {
    next(err);
  }
}

export async function uploadFacultyEvidence(req, res, next) {
  try {
    const { id } = req.params;
    assertValidUuid(id);

    const existing = await db('faculty_achievements').where({ id }).first();
    if (!existing) {
      throw new AppError(404, 'ACHIEVEMENT_NOT_FOUND', 'Faculty achievement not found.');
    }

    if (req.user.role !== ROLES.SUPER_ADMIN && existing.owner_user_id !== req.user.id) {
      throw new AppError(
        403,
        'OWNERSHIP_DENIED',
        'Only the faculty owner may upload certificates to this record.'
      );
    }

    if (!EDITABLE_STATUSES.includes(existing.workflow_status)) {
      throw new AppError(
        409,
        'IMMUTABLE_WORKFLOW_STATE',
        'Certificates can only be uploaded in draft or changes-requested state.'
      );
    }

    const stored = await savePrivateEvidenceFile({
      trackerFolder: 'faculty',
      departmentId: existing.department_id,
      achievementId: existing.id,
      file: req.file
    });

    const [docRow] = await db('faculty_evidence_documents')
      .insert({
        id: uuidv4(),
        achievement_id: existing.id,
        department_id: existing.department_id,
        uploaded_by_user_id: req.user.id,
        original_filename: stored.originalFilename,
        mime_type: stored.mimeType,
        file_size_bytes: stored.fileSizeBytes,
        sha256_hash: stored.sha256Hash,
        storage_object_key: stored.storageObjectKey
      })
      .returning([
        'id',
        'achievement_id',
        'original_filename',
        'mime_type',
        'file_size_bytes',
        'sha256_hash',
        'uploaded_at'
      ]);

    return sendSuccess(res, docRow, null, 201);
  } catch (err) {
    next(err);
  }
}

export async function downloadFacultyEvidence(req, res, next) {
  try {
    const { id, docId } = req.params;
    assertValidUuid(id);
    assertValidUuid(docId, 'document ID');

    const doc = await db('faculty_evidence_documents')
      .where({ id: docId, achievement_id: id })
      .first();

    if (!doc) {
      throw new AppError(404, 'DOCUMENT_NOT_FOUND', 'Certificate file not found.');
    }

    await streamPrivateEvidenceFile(res, doc);
  } catch (err) {
    next(err);
  }
}

export async function deleteFacultyEvidence(req, res, next) {
  try {
    const { id, docId } = req.params;
    assertValidUuid(id);
    assertValidUuid(docId, 'document ID');

    const existing = await db('faculty_achievements').where({ id }).first();
    if (!existing) {
      throw new AppError(404, 'ACHIEVEMENT_NOT_FOUND', 'Faculty achievement not found.');
    }

    if (req.user.role !== ROLES.SUPER_ADMIN && existing.owner_user_id !== req.user.id) {
      throw new AppError(403, 'OWNERSHIP_DENIED', 'Only the owner may delete certificates.');
    }

    if (!EDITABLE_STATUSES.includes(existing.workflow_status)) {
      throw new AppError(
        409,
        'IMMUTABLE_WORKFLOW_STATE',
        'Certificates cannot be removed once submitted or approved.'
      );
    }

    const doc = await db('faculty_evidence_documents')
      .where({ id: docId, achievement_id: id })
      .first();
    if (!doc) {
      throw new AppError(404, 'DOCUMENT_NOT_FOUND', 'Certificate file not found.');
    }

    await db('faculty_evidence_documents').where({ id: docId }).del();
    await deletePrivateEvidenceFile(doc.storage_object_key);

    return sendSuccess(res, { deleted: true, id: docId });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /analytics
 * Independent Faculty Achievement Tracker analytics:
 * - Faculty: strictly personal records, timeline & certificates
 * - HOD: strictly own department faculty overview & pending items
 * - Super Admin: global / filtered department comparison & independent faculty leaderboard
 */
export async function getFacultyAnalytics(req, res, next) {
  try {
    const { category_id, academic_year, start_date, end_date } = req.query;

    const query = db('faculty_achievements')
      .leftJoin('faculty_categories', 'faculty_achievements.category_id', 'faculty_categories.id')
      .leftJoin('departments', 'faculty_achievements.department_id', 'departments.id')
      .leftJoin('users as owner', 'faculty_achievements.owner_user_id', 'owner.id')
      .select(
        'faculty_achievements.id',
        'faculty_achievements.title',
        'faculty_achievements.owner_user_id',
        'faculty_achievements.department_id',
        'faculty_achievements.category_id',
        'faculty_achievements.achieved_on',
        'faculty_achievements.academic_year',
        'faculty_achievements.workflow_status',
        'faculty_achievements.computed_score',
        'faculty_achievements.organization',
        'faculty_categories.code as category_code',
        'faculty_categories.name as category_name',
        'departments.code as department_code',
        'departments.name as department_name',
        'owner.full_name as owner_name',
        'owner.employee_or_roll_no as owner_employee_no'
      );

    if (req.user.role === ROLES.FACULTY) {
      query.where('faculty_achievements.owner_user_id', req.user.id);
    } else if (req.user.role === ROLES.HOD) {
      query.where('faculty_achievements.department_id', req.user.department_id);
    } else if (req.user.role === ROLES.SUPER_ADMIN && req.departmentScope) {
      query.where('faculty_achievements.department_id', req.departmentScope);
    }

    if (category_id) query.where('faculty_achievements.category_id', category_id);
    if (academic_year) query.where('faculty_achievements.academic_year', academic_year);
    if (start_date) query.where('faculty_achievements.achieved_on', '>=', start_date);
    if (end_date) query.where('faculty_achievements.achieved_on', '<=', end_date);

    const rows = await query.orderBy('faculty_achievements.achieved_on', 'desc');
    const shaped = shapeSingleTrackerAnalytics(rows);

    const payload = { ...shaped };

    if (req.user.role === ROLES.FACULTY) {
      const certs = await db('faculty_evidence_documents')
        .join(
          'faculty_achievements',
          'faculty_evidence_documents.achievement_id',
          'faculty_achievements.id'
        )
        .where('faculty_achievements.owner_user_id', req.user.id)
        .select(
          'faculty_evidence_documents.id',
          'faculty_evidence_documents.achievement_id',
          'faculty_evidence_documents.original_filename',
          'faculty_evidence_documents.mime_type',
          'faculty_evidence_documents.file_size_bytes',
          'faculty_evidence_documents.uploaded_at',
          'faculty_achievements.title as achievement_title',
          'faculty_achievements.workflow_status'
        )
        .orderBy('faculty_evidence_documents.uploaded_at', 'desc')
        .limit(20);

      payload.my_certificates = certs;
      payload.my_timeline = rows.slice(0, 12);
    } else {
      const deptMap = {};
      const leaderMap = {};

      for (const row of rows) {
        const dKey = row.department_id;
        if (!deptMap[dKey]) {
          deptMap[dKey] = {
            department_id: dKey,
            department_code: row.department_code || 'DEPT',
            department_name: row.department_name || 'Department',
            total_count: 0,
            verified_count: 0,
            verified_score: 0
          };
        }
        deptMap[dKey].total_count += 1;

        const uKey = row.owner_user_id;
        if (!leaderMap[uKey]) {
          leaderMap[uKey] = {
            user_id: uKey,
            full_name: row.owner_name || 'Faculty',
            employee_or_roll_no: row.owner_employee_no || '',
            department_code: row.department_code || '',
            verified_count: 0,
            verified_score: 0
          };
        }

        if (row.workflow_status === WORKFLOW_STATUSES.COLLEGE_APPROVED) {
          const pts = Number(row.computed_score || 0);
          deptMap[dKey].verified_count += 1;
          deptMap[dKey].verified_score = Number((deptMap[dKey].verified_score + pts).toFixed(2));
          leaderMap[uKey].verified_count += 1;
          leaderMap[uKey].verified_score = Number((leaderMap[uKey].verified_score + pts).toFixed(2));
        }
      }

      payload.department_comparison = Object.values(deptMap).sort(
        (a, b) => b.verified_score - a.verified_score
      );
      payload.leaderboard = Object.values(leaderMap)
        .filter((f) => f.verified_count > 0)
        .sort((a, b) => b.verified_score - a.verified_score)
        .slice(0, 10);
      payload.pending_items = rows
        .filter((r) =>
          [
            WORKFLOW_STATUSES.SUBMITTED,
            WORKFLOW_STATUSES.UNDER_REVIEW,
            WORKFLOW_STATUSES.DEPARTMENT_APPROVED
          ].includes(r.workflow_status)
        )
        .slice(0, 10);
    }

    return sendSuccess(res, payload);
  } catch (err) {
    next(err);
  }
}
