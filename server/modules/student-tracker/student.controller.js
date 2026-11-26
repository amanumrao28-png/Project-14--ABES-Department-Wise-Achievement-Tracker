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
import { calculateStudentScore } from './student.scoring.js';
import { resolveStudentTransition } from './student.workflow.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EDITABLE_STATUSES = [WORKFLOW_STATUSES.DRAFT, WORKFLOW_STATUSES.CHANGES_REQUESTED];

const CATEGORY_GROUPS = {
  competitions: [
    'STUDENT_HACKATHON',
    'STUDENT_TECH_COMPETITION',
    'STUDENT_SPORTS',
    'STUDENT_INNOVATION_AWARD'
  ],
  internships: ['STUDENT_INTERNSHIP'],
  placements: ['STUDENT_PLACEMENT']
};

const assertValidUuid = (id, label = 'achievement ID') => {
  if (!id || !UUID_REGEX.test(id)) {
    throw new AppError(400, 'INVALID_ID', `Invalid ${label} format.`);
  }
};

function assertCanReadStudentRecord(user, record) {
  if (user.role === ROLES.SUPER_ADMIN) return;
  if (user.role === ROLES.HOD || user.role === ROLES.FACULTY) {
    if (record.department_id !== user.department_id) {
      throw new AppError(
        403,
        'DEPARTMENT_ACCESS_DENIED',
        'You do not have access to student achievements outside your department.'
      );
    }
    return;
  }
  if (user.role === ROLES.STUDENT && record.owner_user_id === user.id) {
    return;
  }
  throw new AppError(
    403,
    'OWNERSHIP_DENIED',
    'You do not have permission to access this student achievement.'
  );
}

export async function listStudentCategories(req, res, next) {
  try {
    const categories = await db('student_categories')
      .where({ is_active: true })
      .orderBy('name', 'asc');
    return sendSuccess(res, categories);
  } catch (err) {
    next(err);
  }
}

export async function listStudentAchievements(req, res, next) {
  try {
    const {
      page,
      limit,
      owner_user_id,
      category_id,
      category_group,
      academic_year,
      workflow_status,
      achievement_level,
      search
    } = req.query;

    const baseQuery = db('student_achievements')
      .leftJoin('student_categories', 'student_achievements.category_id', 'student_categories.id');

    if (req.user.role === ROLES.STUDENT) {
      // Students may ONLY view their own achievements
      baseQuery.where('student_achievements.owner_user_id', req.user.id);
    } else if (req.user.role === ROLES.FACULTY || req.user.role === ROLES.HOD) {
      // Faculty (read-only) and HOD are strictly scoped to their own department
      baseQuery.where('student_achievements.department_id', req.user.department_id);
      if (owner_user_id) {
        baseQuery.where('student_achievements.owner_user_id', owner_user_id);
      }
    } else if (req.user.role === ROLES.SUPER_ADMIN) {
      if (req.departmentScope) {
        baseQuery.where('student_achievements.department_id', req.departmentScope);
      }
      if (owner_user_id) {
        baseQuery.where('student_achievements.owner_user_id', owner_user_id);
      }
    }

    if (category_id) baseQuery.where('student_achievements.category_id', category_id);
    if (category_group && CATEGORY_GROUPS[category_group]) {
      baseQuery.whereIn('student_categories.code', CATEGORY_GROUPS[category_group]);
    }
    if (academic_year) baseQuery.where('student_achievements.academic_year', academic_year);
    if (workflow_status) baseQuery.where('student_achievements.workflow_status', workflow_status);
    if (achievement_level) baseQuery.where('student_achievements.achievement_level', achievement_level);

    if (search && search.trim()) {
      const pattern = `%${search.trim().toLowerCase()}%`;
      baseQuery.where(function () {
        this.whereRaw('LOWER(student_achievements.title) LIKE ?', [pattern])
          .orWhereRaw('LOWER(student_achievements.organization) LIKE ?', [pattern])
          .orWhereRaw('LOWER(student_achievements.description) LIKE ?', [pattern]);
      });
    }

    const countRow = await baseQuery.clone().count('student_achievements.id as count').first();
    const total = parseInt(countRow?.count || 0, 10);
    const offset = (page - 1) * limit;

    const items = await baseQuery
      .clone()
      .leftJoin('departments', 'student_achievements.department_id', 'departments.id')
      .leftJoin('users as owner', 'student_achievements.owner_user_id', 'owner.id')
      .select(
        'student_achievements.*',
        'student_categories.code as category_code',
        'student_categories.name as category_name',
        'departments.code as department_code',
        'departments.name as department_name',
        'owner.full_name as owner_name',
        'owner.employee_or_roll_no as owner_roll_no'
      )
      .orderBy('student_achievements.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    const evidenceCounts = items.length
      ? await db('student_evidence_documents')
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

export async function getStudentPortfolio(req, res, next) {
  try {
    const requestedUserId = req.query.userId;
    const targetUserId =
      req.user.role === ROLES.STUDENT || !requestedUserId ? req.user.id : requestedUserId;

    if (req.user.role === ROLES.STUDENT && targetUserId !== req.user.id) {
      throw new AppError(
        403,
        'OWNERSHIP_DENIED',
        'Students can only view their own personal achievement portfolio.'
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
      throw new AppError(404, 'USER_NOT_FOUND', 'Student user not found.');
    }

    if (
      (req.user.role === ROLES.HOD || req.user.role === ROLES.FACULTY) &&
      owner.department_id !== req.user.department_id
    ) {
      throw new AppError(
        403,
        'DEPARTMENT_ACCESS_DENIED',
        'You may only inspect student portfolios within your assigned department.'
      );
    }

    const query = db('student_achievements')
      .leftJoin('student_categories', 'student_achievements.category_id', 'student_categories.id')
      .where('student_achievements.owner_user_id', targetUserId)
      .select(
        'student_achievements.*',
        'student_categories.code as category_code',
        'student_categories.name as category_name'
      )
      .orderBy('student_achievements.achieved_on', 'desc');

    if (req.query.academic_year) {
      query.where('student_achievements.academic_year', req.query.academic_year);
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
      rejected: 0,
      competitions_count: 0,
      internships_count: 0,
      placements_count: 0
    };
    let totalStudentScore = 0;
    const categorySummaryMap = {};

    for (const row of records) {
      if (statusCounts[row.workflow_status] !== undefined) {
        statusCounts[row.workflow_status] += 1;
      }
      if (row.workflow_status === WORKFLOW_STATUSES.COLLEGE_APPROVED) {
        statusCounts.approved += 1;
        totalStudentScore += Number(row.computed_score || 0);
      }
      if (CATEGORY_GROUPS.competitions.includes(row.category_code)) {
        statusCounts.competitions_count += 1;
      } else if (CATEGORY_GROUPS.internships.includes(row.category_code)) {
        statusCounts.internships_count += 1;
      } else if (CATEGORY_GROUPS.placements.includes(row.category_code)) {
        statusCounts.placements_count += 1;
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
        total_student_score: Number(totalStudentScore.toFixed(2))
      },
      by_category: Object.values(categorySummaryMap),
      records
    });
  } catch (err) {
    next(err);
  }
}

export async function getStudentAchievementById(req, res, next) {
  try {
    const { id } = req.params;
    assertValidUuid(id);

    const achievement = await db('student_achievements')
      .leftJoin('student_categories', 'student_achievements.category_id', 'student_categories.id')
      .leftJoin('departments', 'student_achievements.department_id', 'departments.id')
      .leftJoin('users as owner', 'student_achievements.owner_user_id', 'owner.id')
      .leftJoin('users as approver', 'student_achievements.approved_by_user_id', 'approver.id')
      .where('student_achievements.id', id)
      .select(
        'student_achievements.*',
        'student_categories.code as category_code',
        'student_categories.name as category_name',
        'departments.code as department_code',
        'departments.name as department_name',
        'owner.full_name as owner_name',
        'owner.employee_or_roll_no as owner_roll_no',
        'approver.full_name as approved_by_name'
      )
      .first();

    if (!achievement) {
      throw new AppError(404, 'ACHIEVEMENT_NOT_FOUND', 'Student achievement not found.');
    }

    assertCanReadStudentRecord(req.user, achievement);

    const [approvalLogs, documents] = await Promise.all([
      db('student_approval_logs')
        .leftJoin('users', 'student_approval_logs.actor_user_id', 'users.id')
        .where('student_approval_logs.achievement_id', id)
        .select(
          'student_approval_logs.*',
          'users.full_name as actor_name',
          'users.role as actor_role'
        )
        .orderBy('student_approval_logs.acted_at', 'desc'),
      db('student_evidence_documents')
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

export async function createStudentAchievement(req, res, next) {
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

    const category = await db('student_categories')
      .where({ id: category_id, is_active: true })
      .first();
    if (!category) {
      throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Student achievement category not found.');
    }

    const achievementId = uuidv4();
    let created;

    await db.transaction(async (trx) => {
      const [row] = await trx('student_achievements')
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

      await trx('student_approval_logs').insert({
        id: uuidv4(),
        achievement_id: achievementId,
        actor_user_id: req.user.id,
        from_status: null,
        to_status: WORKFLOW_STATUSES.DRAFT,
        remarks: 'Personal student achievement draft created.'
      });
    });

    auditLog({
      actorUserId: req.user.id,
      actorRole: req.user.role,
      actorDepartmentId: req.user.department_id,
      trackerDomain: TRACKER_DOMAINS.STUDENT,
      action: 'CREATE',
      entityType: 'student_achievement',
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

export async function updateStudentAchievement(req, res, next) {
  try {
    const { id } = req.params;
    assertValidUuid(id);

    const existing = await db('student_achievements').where({ id }).first();
    if (!existing) {
      throw new AppError(404, 'ACHIEVEMENT_NOT_FOUND', 'Student achievement not found.');
    }

    if (req.user.role !== ROLES.SUPER_ADMIN && existing.owner_user_id !== req.user.id) {
      throw new AppError(
        403,
        'OWNERSHIP_DENIED',
        'Only the student owner may edit this achievement.'
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
      const cat = await db('student_categories').where({ id: category_id, is_active: true }).first();
      if (!cat) throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Student category not found.');
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

    const [updated] = await db('student_achievements')
      .where({ id })
      .update(updates)
      .returning('*');

    auditLog({
      actorUserId: req.user.id,
      actorRole: req.user.role,
      actorDepartmentId: req.user.department_id,
      trackerDomain: TRACKER_DOMAINS.STUDENT,
      action: 'UPDATE',
      entityType: 'student_achievement',
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

export async function deleteStudentAchievement(req, res, next) {
  try {
    const { id } = req.params;
    assertValidUuid(id);

    const existing = await db('student_achievements').where({ id }).first();
    if (!existing) {
      throw new AppError(404, 'ACHIEVEMENT_NOT_FOUND', 'Student achievement not found.');
    }

    if (req.user.role !== ROLES.SUPER_ADMIN && existing.owner_user_id !== req.user.id) {
      throw new AppError(
        403,
        'OWNERSHIP_DENIED',
        'Only the student owner may delete this draft achievement.'
      );
    }

    if (!EDITABLE_STATUSES.includes(existing.workflow_status)) {
      throw new AppError(
        409,
        'IMMUTABLE_WORKFLOW_STATE',
        'Only draft or returned achievements may be deleted.'
      );
    }

    const docs = await db('student_evidence_documents').where({ achievement_id: id });
    await db('student_achievements').where({ id }).del();
    await Promise.all(docs.map((d) => deletePrivateEvidenceFile(d.storage_object_key)));

    return sendSuccess(res, { deleted: true, id });
  } catch (err) {
    next(err);
  }
}

export async function submitStudentAchievement(req, res, next) {
  try {
    const { id } = req.params;
    assertValidUuid(id);

    const existing = await db('student_achievements').where({ id }).first();
    if (!existing) {
      throw new AppError(404, 'ACHIEVEMENT_NOT_FOUND', 'Student achievement not found.');
    }

    if (req.user.role !== ROLES.SUPER_ADMIN && existing.owner_user_id !== req.user.id) {
      throw new AppError(
        403,
        'OWNERSHIP_DENIED',
        'Only the student owner may submit this achievement.'
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
      const [row] = await trx('student_achievements')
        .where({ id })
        .update({
          workflow_status: WORKFLOW_STATUSES.SUBMITTED,
          submitted_at: trx.fn.now(),
          updated_at: trx.fn.now()
        })
        .returning('*');
      updated = row;

      await trx('student_approval_logs').insert({
        id: uuidv4(),
        achievement_id: id,
        actor_user_id: req.user.id,
        actor_role: req.user.role,
        from_status: existing.workflow_status,
        to_status: WORKFLOW_STATUSES.SUBMITTED,
        remarks: 'Submitted for faculty coordinator / HOD verification.'
      });
    });

    const [coordIds, hodIds] = await Promise.all([
      findReviewerUserIds({
        role: ROLES.FACULTY,
        departmentId: updated.department_id,
        coordinatorOnly: true
      }),
      findReviewerUserIds({
        role: ROLES.HOD,
        departmentId: updated.department_id
      })
    ]);
    await notifyUsers({
      recipientUserIds: [...coordIds, ...hodIds].filter((uid) => uid !== req.user.id),
      trackerDomain: TRACKER_DOMAINS.STUDENT,
      achievementId: id,
      title: `Student Submission: ${updated.title}`,
      message: `A student achievement has been submitted for department review.`,
      status: WORKFLOW_STATUSES.SUBMITTED
    });

    auditLog({
      actorUserId: req.user.id,
      actorRole: req.user.role,
      actorDepartmentId: req.user.department_id,
      trackerDomain: TRACKER_DOMAINS.STUDENT,
      action: 'SUBMIT',
      entityType: 'student_achievement',
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

export async function reviewStudentAchievement(req, res, next) {
  try {
    const { id } = req.params;
    assertValidUuid(id);

    const existing = await db('student_achievements').where({ id }).first();
    if (!existing) {
      throw new AppError(404, 'ACHIEVEMENT_NOT_FOUND', 'Student achievement not found.');
    }

    const departmentConfig = await db('departments')
      .where({ id: existing.department_id })
      .select('id', 'student_requires_college_approval')
      .first();

    const { decision, remarks, override_self_approval } = req.body;
    const transition = resolveStudentTransition({
      actor: req.user,
      record: existing,
      decision,
      departmentConfig,
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
        const { computedScore, scoringRuleVersion } = await calculateStudentScore(existing, trx);
        patch.computed_score = computedScore;
        patch.scoring_rule_version = scoringRuleVersion;
        patch.approved_by_user_id = req.user.id;
        patch.approved_at = trx.fn.now();
      } else if (transition.clearScore) {
        patch.computed_score = null;
        patch.scoring_rule_version = null;
      }

      const [row] = await trx('student_achievements').where({ id }).update(patch).returning('*');
      updated = row;

      await trx('student_approval_logs').insert({
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
      trackerDomain: TRACKER_DOMAINS.STUDENT,
      achievementId: id,
      title: `Student Achievement: ${updated.title}`,
      message: `Status updated to ${transition.nextStatus.replaceAll('_', ' ')}${remarks ? ` — "${remarks.trim()}"` : ''}.`,
      status: transition.nextStatus
    });

    if (transition.nextStatus === WORKFLOW_STATUSES.DEPARTMENT_APPROVED) {
      if (departmentConfig?.student_requires_college_approval) {
        const superAdminIds = await findReviewerUserIds({ role: ROLES.SUPER_ADMIN });
        await notifyUsers({
          recipientUserIds: superAdminIds,
          trackerDomain: TRACKER_DOMAINS.STUDENT,
          achievementId: id,
          title: `College Verification Needed: ${updated.title}`,
          message: `Department-approved student achievement is awaiting final college approval.`,
          status: transition.nextStatus
        });
      } else {
        const hodIds = await findReviewerUserIds({
          role: ROLES.HOD,
          departmentId: updated.department_id
        });
        await notifyUsers({
          recipientUserIds: hodIds.filter((uid) => uid !== req.user.id),
          trackerDomain: TRACKER_DOMAINS.STUDENT,
          achievementId: id,
          title: `HOD Final Verification Needed: ${updated.title}`,
          message: `Faculty coordinator approved a student achievement for HOD final sign-off.`,
          status: transition.nextStatus
        });
      }
    }

    auditLog({
      actorUserId: req.user.id,
      actorRole: req.user.role,
      actorDepartmentId: req.user.department_id,
      trackerDomain: TRACKER_DOMAINS.STUDENT,
      action: decision.toUpperCase(),
      entityType: 'student_achievement',
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

export async function uploadStudentEvidence(req, res, next) {
  try {
    const { id } = req.params;
    assertValidUuid(id);

    const existing = await db('student_achievements').where({ id }).first();
    if (!existing) {
      throw new AppError(404, 'ACHIEVEMENT_NOT_FOUND', 'Student achievement not found.');
    }

    if (req.user.role !== ROLES.SUPER_ADMIN && existing.owner_user_id !== req.user.id) {
      throw new AppError(
        403,
        'OWNERSHIP_DENIED',
        'Only the student owner may upload certificates to this record.'
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
      trackerFolder: 'student',
      departmentId: existing.department_id,
      achievementId: existing.id,
      file: req.file
    });

    const [docRow] = await db('student_evidence_documents')
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

export async function downloadStudentEvidence(req, res, next) {
  try {
    const { id, docId } = req.params;
    assertValidUuid(id);
    assertValidUuid(docId, 'document ID');

    const achievement = await db('student_achievements').where({ id }).first();
    if (!achievement) {
      throw new AppError(404, 'ACHIEVEMENT_NOT_FOUND', 'Student achievement not found.');
    }

    assertCanReadStudentRecord(req.user, achievement);

    const doc = await db('student_evidence_documents')
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

export async function deleteStudentEvidence(req, res, next) {
  try {
    const { id, docId } = req.params;
    assertValidUuid(id);
    assertValidUuid(docId, 'document ID');

    const existing = await db('student_achievements').where({ id }).first();
    if (!existing) {
      throw new AppError(404, 'ACHIEVEMENT_NOT_FOUND', 'Student achievement not found.');
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

    const doc = await db('student_evidence_documents')
      .where({ id: docId, achievement_id: id })
      .first();
    if (!doc) {
      throw new AppError(404, 'DOCUMENT_NOT_FOUND', 'Certificate file not found.');
    }

    await db('student_evidence_documents').where({ id: docId }).del();
    await deletePrivateEvidenceFile(doc.storage_object_key);

    return sendSuccess(res, { deleted: true, id: docId });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /analytics
 * Independent Student Achievement Tracker analytics:
 * - Student: strictly personal records, competitions/internships/placements breakdown & certificates
 * - Faculty: read-only assigned department student analytics
 * - HOD: assigned department student overview, pending items & dept leaderboard
 * - Super Admin: global / filtered department comparison & independent student leaderboard
 */
export async function getStudentAnalytics(req, res, next) {
  try {
    const { category_id, academic_year, start_date, end_date } = req.query;

    const query = db('student_achievements')
      .leftJoin('student_categories', 'student_achievements.category_id', 'student_categories.id')
      .leftJoin('departments', 'student_achievements.department_id', 'departments.id')
      .leftJoin('users as owner', 'student_achievements.owner_user_id', 'owner.id')
      .select(
        'student_achievements.id',
        'student_achievements.title',
        'student_achievements.owner_user_id',
        'student_achievements.department_id',
        'student_achievements.category_id',
        'student_achievements.achieved_on',
        'student_achievements.academic_year',
        'student_achievements.workflow_status',
        'student_achievements.computed_score',
        'student_achievements.organization',
        'student_categories.code as category_code',
        'student_categories.name as category_name',
        'departments.code as department_code',
        'departments.name as department_name',
        'owner.full_name as owner_name',
        'owner.employee_or_roll_no as owner_roll_no'
      );

    if (req.user.role === ROLES.STUDENT) {
      query.where('student_achievements.owner_user_id', req.user.id);
    } else if (req.user.role === ROLES.FACULTY || req.user.role === ROLES.HOD) {
      query.where('student_achievements.department_id', req.user.department_id);
    } else if (req.user.role === ROLES.SUPER_ADMIN && req.departmentScope) {
      query.where('student_achievements.department_id', req.departmentScope);
    }

    if (category_id) query.where('student_achievements.category_id', category_id);
    if (academic_year) query.where('student_achievements.academic_year', academic_year);
    if (start_date) query.where('student_achievements.achieved_on', '>=', start_date);
    if (end_date) query.where('student_achievements.achieved_on', '<=', end_date);

    const rows = await query.orderBy('student_achievements.achieved_on', 'desc');
    const shaped = shapeSingleTrackerAnalytics(rows);

    let competitionsCount = 0;
    let internshipsCount = 0;
    let placementsCount = 0;

    for (const row of rows) {
      if (CATEGORY_GROUPS.competitions.includes(row.category_code)) competitionsCount += 1;
      else if (CATEGORY_GROUPS.internships.includes(row.category_code)) internshipsCount += 1;
      else if (CATEGORY_GROUPS.placements.includes(row.category_code)) placementsCount += 1;
    }

    const payload = {
      ...shaped,
      summary: {
        ...shaped.summary,
        competitions_count: competitionsCount,
        internships_count: internshipsCount,
        placements_count: placementsCount
      }
    };

    if (req.user.role === ROLES.STUDENT) {
      const certs = await db('student_evidence_documents')
        .join(
          'student_achievements',
          'student_evidence_documents.achievement_id',
          'student_achievements.id'
        )
        .where('student_achievements.owner_user_id', req.user.id)
        .select(
          'student_evidence_documents.id',
          'student_evidence_documents.achievement_id',
          'student_evidence_documents.original_filename',
          'student_evidence_documents.mime_type',
          'student_evidence_documents.file_size_bytes',
          'student_evidence_documents.uploaded_at',
          'student_achievements.title as achievement_title',
          'student_achievements.workflow_status'
        )
        .orderBy('student_evidence_documents.uploaded_at', 'desc')
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
            full_name: row.owner_name || 'Student',
            employee_or_roll_no: row.owner_roll_no || '',
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
        .filter((s) => s.verified_count > 0)
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
      payload.recent_items = rows.slice(0, 10);
    }

    return sendSuccess(res, payload);
  } catch (err) {
    next(err);
  }
}
