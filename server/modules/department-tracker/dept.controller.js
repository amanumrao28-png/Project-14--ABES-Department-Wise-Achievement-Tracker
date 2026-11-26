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
import { calculateDepartmentScore } from './dept.scoring.js';
import { resolveDepartmentTransition } from './dept.workflow.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EDITABLE_STATUSES = [WORKFLOW_STATUSES.DRAFT, WORKFLOW_STATUSES.CHANGES_REQUESTED];

const assertValidUuid = (id, label = 'achievement ID') => {
  if (!id || !UUID_REGEX.test(id)) {
    throw new AppError(400, 'INVALID_ID', `Invalid ${label} format.`);
  }
};

export async function listDepartmentCategories(req, res, next) {
  try {
    const categories = await db('dept_categories')
      .where({ is_active: true })
      .orderBy('name', 'asc');
    return sendSuccess(res, categories);
  } catch (err) {
    next(err);
  }
}

export async function listDepartmentAchievements(req, res, next) {
  try {
    const {
      page,
      limit,
      category_id,
      academic_year,
      workflow_status,
      achievement_level,
      search
    } = req.query;

    const baseQuery = db('dept_achievements');

    if (req.user.role !== ROLES.SUPER_ADMIN) {
      baseQuery.where('dept_achievements.department_id', req.user.department_id);
    } else if (req.departmentScope) {
      baseQuery.where('dept_achievements.department_id', req.departmentScope);
    }

    if (category_id) baseQuery.where('dept_achievements.category_id', category_id);
    if (academic_year) baseQuery.where('dept_achievements.academic_year', academic_year);
    if (workflow_status) baseQuery.where('dept_achievements.workflow_status', workflow_status);
    if (achievement_level) baseQuery.where('dept_achievements.achievement_level', achievement_level);

    if (search && search.trim()) {
      const pattern = `%${search.trim().toLowerCase()}%`;
      baseQuery.where(function () {
        this.whereRaw('LOWER(dept_achievements.title) LIKE ?', [pattern])
          .orWhereRaw('LOWER(dept_achievements.organization) LIKE ?', [pattern])
          .orWhereRaw('LOWER(dept_achievements.description) LIKE ?', [pattern]);
      });
    }

    const countRow = await baseQuery.clone().count('dept_achievements.id as count').first();
    const total = parseInt(countRow?.count || 0, 10);
    const offset = (page - 1) * limit;

    const items = await baseQuery
      .clone()
      .leftJoin('dept_categories', 'dept_achievements.category_id', 'dept_categories.id')
      .leftJoin('departments', 'dept_achievements.department_id', 'departments.id')
      .leftJoin('users as creator', 'dept_achievements.created_by_user_id', 'creator.id')
      .select(
        'dept_achievements.*',
        'dept_categories.code as category_code',
        'dept_categories.name as category_name',
        'departments.code as department_code',
        'departments.name as department_name',
        'creator.full_name as created_by_name'
      )
      .orderBy('dept_achievements.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    const evidenceCounts = items.length
      ? await db('dept_evidence_documents')
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

    const enriched = items.map((item) => ({
      ...item,
      evidence_count: countMap[item.id] || 0
    }));

    return sendSuccess(res, enriched, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1
    });
  } catch (err) {
    next(err);
  }
}

export async function getDepartmentAchievementById(req, res, next) {
  try {
    const { id } = req.params;
    assertValidUuid(id);

    const achievement = await db('dept_achievements')
      .leftJoin('dept_categories', 'dept_achievements.category_id', 'dept_categories.id')
      .leftJoin('departments', 'dept_achievements.department_id', 'departments.id')
      .leftJoin('users as creator', 'dept_achievements.created_by_user_id', 'creator.id')
      .leftJoin('users as approver', 'dept_achievements.approved_by_user_id', 'approver.id')
      .where('dept_achievements.id', id)
      .select(
        'dept_achievements.*',
        'dept_categories.code as category_code',
        'dept_categories.name as category_name',
        'departments.code as department_code',
        'departments.name as department_name',
        'creator.full_name as created_by_name',
        'approver.full_name as approved_by_name'
      )
      .first();

    if (!achievement) {
      throw new AppError(404, 'ACHIEVEMENT_NOT_FOUND', 'Department achievement not found.');
    }

    if (
      req.user.role !== ROLES.SUPER_ADMIN &&
      achievement.department_id !== req.user.department_id
    ) {
      throw new AppError(
        403,
        'DEPARTMENT_ACCESS_DENIED',
        'You do not have access to another department achievement.'
      );
    }

    const [approvalLogs, documents] = await Promise.all([
      db('dept_approval_logs')
        .leftJoin('users', 'dept_approval_logs.actor_user_id', 'users.id')
        .where('dept_approval_logs.achievement_id', id)
        .select(
          'dept_approval_logs.*',
          'users.full_name as actor_name',
          'users.role as actor_role'
        )
        .orderBy('dept_approval_logs.acted_at', 'desc'),
      db('dept_evidence_documents')
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

export async function createDepartmentAchievement(req, res, next) {
  try {
    const {
      department_id,
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

    // Non-Super-Admin users are forcibly bound to their assigned department
    const targetDepartmentId =
      req.user.role === ROLES.SUPER_ADMIN
        ? department_id || req.user.department_id
        : req.user.department_id;

    if (
      req.user.role !== ROLES.SUPER_ADMIN &&
      department_id &&
      department_id !== req.user.department_id
    ) {
      throw new AppError(
        403,
        'DEPARTMENT_ACCESS_DENIED',
        'HODs may only create achievements for their assigned department.'
      );
    }

    const [department, category] = await Promise.all([
      db('departments').where({ id: targetDepartmentId, is_active: true }).first(),
      db('dept_categories').where({ id: category_id, is_active: true }).first()
    ]);

    if (!department) {
      throw new AppError(404, 'DEPARTMENT_NOT_FOUND', 'Target department not found or inactive.');
    }
    if (!category) {
      throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Department achievement category not found.');
    }

    const achievementId = uuidv4();
    let created;

    await db.transaction(async (trx) => {
      const [row] = await trx('dept_achievements')
        .insert({
          id: achievementId,
          department_id: targetDepartmentId,
          category_id,
          created_by_user_id: req.user.id,
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

      await trx('dept_approval_logs').insert({
        id: uuidv4(),
        achievement_id: achievementId,
        actor_user_id: req.user.id,
        from_status: null,
        to_status: WORKFLOW_STATUSES.DRAFT,
        remarks: 'Department achievement draft created.'
      });
    });

    auditLog({
      actorUserId: req.user.id,
      actorRole: req.user.role,
      actorDepartmentId: req.user.department_id,
      trackerDomain: TRACKER_DOMAINS.DEPARTMENT,
      action: 'CREATE',
      entityType: 'dept_achievement',
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

export async function updateDepartmentAchievement(req, res, next) {
  try {
    const { id } = req.params;
    assertValidUuid(id);

    const existing = await db('dept_achievements').where({ id }).first();
    if (!existing) {
      throw new AppError(404, 'ACHIEVEMENT_NOT_FOUND', 'Department achievement not found.');
    }

    if (req.user.role !== ROLES.SUPER_ADMIN && existing.department_id !== req.user.department_id) {
      throw new AppError(403, 'DEPARTMENT_ACCESS_DENIED', 'Cross-department access denied.');
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
      const cat = await db('dept_categories').where({ id: category_id, is_active: true }).first();
      if (!cat) throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Department category not found.');
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

    const [updated] = await db('dept_achievements')
      .where({ id })
      .update(updates)
      .returning('*');

    auditLog({
      actorUserId: req.user.id,
      actorRole: req.user.role,
      actorDepartmentId: req.user.department_id,
      trackerDomain: TRACKER_DOMAINS.DEPARTMENT,
      action: 'UPDATE',
      entityType: 'dept_achievement',
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

export async function deleteDepartmentAchievement(req, res, next) {
  try {
    const { id } = req.params;
    assertValidUuid(id);

    const existing = await db('dept_achievements').where({ id }).first();
    if (!existing) {
      throw new AppError(404, 'ACHIEVEMENT_NOT_FOUND', 'Department achievement not found.');
    }

    if (req.user.role !== ROLES.SUPER_ADMIN && existing.department_id !== req.user.department_id) {
      throw new AppError(403, 'DEPARTMENT_ACCESS_DENIED', 'Cross-department access denied.');
    }

    if (!EDITABLE_STATUSES.includes(existing.workflow_status)) {
      throw new AppError(
        409,
        'IMMUTABLE_WORKFLOW_STATE',
        'Only draft or returned achievements may be deleted.'
      );
    }

    const docs = await db('dept_evidence_documents').where({ achievement_id: id });
    await db('dept_achievements').where({ id }).del();
    await Promise.all(docs.map((d) => deletePrivateEvidenceFile(d.storage_object_key)));

    auditLog({
      actorUserId: req.user.id,
      actorRole: req.user.role,
      actorDepartmentId: req.user.department_id,
      trackerDomain: TRACKER_DOMAINS.DEPARTMENT,
      action: 'DELETE',
      entityType: 'dept_achievement',
      entityId: id,
      targetDepartmentId: existing.department_id,
      beforeState: existing,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      requestId: req.requestId
    });

    return sendSuccess(res, { deleted: true, id });
  } catch (err) {
    next(err);
  }
}

export async function submitDepartmentAchievement(req, res, next) {
  try {
    const { id } = req.params;
    assertValidUuid(id);

    const existing = await db('dept_achievements').where({ id }).first();
    if (!existing) {
      throw new AppError(404, 'ACHIEVEMENT_NOT_FOUND', 'Department achievement not found.');
    }

    if (req.user.role !== ROLES.SUPER_ADMIN && existing.department_id !== req.user.department_id) {
      throw new AppError(403, 'DEPARTMENT_ACCESS_DENIED', 'Cross-department access denied.');
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
      const [row] = await trx('dept_achievements')
        .where({ id })
        .update({
          workflow_status: WORKFLOW_STATUSES.SUBMITTED,
          submitted_at: trx.fn.now(),
          updated_at: trx.fn.now()
        })
        .returning('*');
      updated = row;

      await trx('dept_approval_logs').insert({
        id: uuidv4(),
        achievement_id: id,
        actor_user_id: req.user.id,
        actor_role: req.user.role,
        from_status: existing.workflow_status,
        to_status: WORKFLOW_STATUSES.SUBMITTED,
        remarks: 'Submitted for college management verification.'
      });
    });

    const superAdminIds = await findReviewerUserIds({ role: ROLES.SUPER_ADMIN });
    await notifyUsers({
      recipientUserIds: superAdminIds.filter((uid) => uid !== req.user.id),
      trackerDomain: TRACKER_DOMAINS.DEPARTMENT,
      achievementId: id,
      title: `Department Submission: ${updated.title}`,
      message: `A department achievement has been submitted for college management review.`,
      status: WORKFLOW_STATUSES.SUBMITTED
    });

    auditLog({
      actorUserId: req.user.id,
      actorRole: req.user.role,
      actorDepartmentId: req.user.department_id,
      trackerDomain: TRACKER_DOMAINS.DEPARTMENT,
      action: 'SUBMIT',
      entityType: 'dept_achievement',
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

export async function reviewDepartmentAchievement(req, res, next) {
  try {
    const { id } = req.params;
    assertValidUuid(id);

    const existing = await db('dept_achievements').where({ id }).first();
    if (!existing) {
      throw new AppError(404, 'ACHIEVEMENT_NOT_FOUND', 'Department achievement not found.');
    }

    const { decision, remarks, override_self_approval } = req.body;
    const transition = resolveDepartmentTransition({
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

      if (transition.isFinalVerified) {
        const { computedScore, scoringRuleVersion } = await calculateDepartmentScore(
          existing,
          trx
        );
        patch.computed_score = computedScore;
        patch.scoring_rule_version = scoringRuleVersion;
        patch.approved_by_user_id = req.user.id;
        patch.approved_at = trx.fn.now();
      } else if (transition.clearScore) {
        patch.computed_score = null;
        patch.scoring_rule_version = null;
      }

      const [row] = await trx('dept_achievements').where({ id }).update(patch).returning('*');
      updated = row;

      await trx('dept_approval_logs').insert({
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
      recipientUserIds: [existing.created_by_user_id],
      trackerDomain: TRACKER_DOMAINS.DEPARTMENT,
      achievementId: id,
      title: `Department Achievement: ${updated.title}`,
      message: `Status updated to ${transition.nextStatus.replaceAll('_', ' ')}${remarks ? ` — "${remarks.trim()}"` : ''}.`,
      status: transition.nextStatus
    });

    auditLog({
      actorUserId: req.user.id,
      actorRole: req.user.role,
      actorDepartmentId: req.user.department_id,
      trackerDomain: TRACKER_DOMAINS.DEPARTMENT,
      action: decision.toUpperCase(),
      entityType: 'dept_achievement',
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

export async function uploadDepartmentEvidence(req, res, next) {
  try {
    const { id } = req.params;
    assertValidUuid(id);

    const existing = await db('dept_achievements').where({ id }).first();
    if (!existing) {
      throw new AppError(404, 'ACHIEVEMENT_NOT_FOUND', 'Department achievement not found.');
    }

    if (req.user.role !== ROLES.SUPER_ADMIN && existing.department_id !== req.user.department_id) {
      throw new AppError(403, 'DEPARTMENT_ACCESS_DENIED', 'Cross-department access denied.');
    }

    if (!EDITABLE_STATUSES.includes(existing.workflow_status)) {
      throw new AppError(
        409,
        'IMMUTABLE_WORKFLOW_STATE',
        'Evidence documents can only be uploaded in draft or changes-requested state.'
      );
    }

    const stored = await savePrivateEvidenceFile({
      trackerFolder: 'department',
      departmentId: existing.department_id,
      achievementId: existing.id,
      file: req.file
    });

    const [docRow] = await db('dept_evidence_documents')
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

    auditLog({
      actorUserId: req.user.id,
      actorRole: req.user.role,
      actorDepartmentId: req.user.department_id,
      trackerDomain: TRACKER_DOMAINS.DEPARTMENT,
      action: 'UPLOAD_EVIDENCE',
      entityType: 'dept_evidence_document',
      entityId: docRow.id,
      targetDepartmentId: existing.department_id,
      afterState: docRow,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      requestId: req.requestId
    });

    return sendSuccess(res, docRow, null, 201);
  } catch (err) {
    next(err);
  }
}

export async function downloadDepartmentEvidence(req, res, next) {
  try {
    const { id, docId } = req.params;
    assertValidUuid(id);
    assertValidUuid(docId, 'document ID');

    const doc = await db('dept_evidence_documents')
      .where({ id: docId, achievement_id: id })
      .first();

    if (!doc) {
      throw new AppError(404, 'DOCUMENT_NOT_FOUND', 'Evidence document not found.');
    }

    if (req.user.role !== ROLES.SUPER_ADMIN && doc.department_id !== req.user.department_id) {
      throw new AppError(403, 'DEPARTMENT_ACCESS_DENIED', 'Cross-department access denied.');
    }

    auditLog({
      actorUserId: req.user.id,
      actorRole: req.user.role,
      actorDepartmentId: req.user.department_id,
      trackerDomain: TRACKER_DOMAINS.DEPARTMENT,
      action: 'DOWNLOAD_EVIDENCE',
      entityType: 'dept_evidence_document',
      entityId: doc.id,
      targetDepartmentId: doc.department_id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      requestId: req.requestId
    });

    await streamPrivateEvidenceFile(res, doc);
  } catch (err) {
    next(err);
  }
}

export async function deleteDepartmentEvidence(req, res, next) {
  try {
    const { id, docId } = req.params;
    assertValidUuid(id);
    assertValidUuid(docId, 'document ID');

    const existing = await db('dept_achievements').where({ id }).first();
    if (!existing) {
      throw new AppError(404, 'ACHIEVEMENT_NOT_FOUND', 'Department achievement not found.');
    }

    if (req.user.role !== ROLES.SUPER_ADMIN && existing.department_id !== req.user.department_id) {
      throw new AppError(403, 'DEPARTMENT_ACCESS_DENIED', 'Cross-department access denied.');
    }

    if (!EDITABLE_STATUSES.includes(existing.workflow_status)) {
      throw new AppError(
        409,
        'IMMUTABLE_WORKFLOW_STATE',
        'Evidence cannot be removed once submitted or approved.'
      );
    }

    const doc = await db('dept_evidence_documents')
      .where({ id: docId, achievement_id: id })
      .first();
    if (!doc) {
      throw new AppError(404, 'DOCUMENT_NOT_FOUND', 'Evidence document not found.');
    }

    await db('dept_evidence_documents').where({ id: docId }).del();
    await deletePrivateEvidenceFile(doc.storage_object_key);

    return sendSuccess(res, { deleted: true, id: docId });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /analytics
 * Independent Department Achievement Tracker analytics (Super Admin global, HOD own dept).
 */
export async function getDepartmentAnalytics(req, res, next) {
  try {
    const { category_id, academic_year, start_date, end_date } = req.query;

    const query = db('dept_achievements')
      .leftJoin('dept_categories', 'dept_achievements.category_id', 'dept_categories.id')
      .leftJoin('departments', 'dept_achievements.department_id', 'departments.id')
      .select(
        'dept_achievements.id',
        'dept_achievements.title',
        'dept_achievements.department_id',
        'dept_achievements.category_id',
        'dept_achievements.achieved_on',
        'dept_achievements.academic_year',
        'dept_achievements.workflow_status',
        'dept_achievements.computed_score',
        'dept_achievements.organization',
        'dept_categories.code as category_code',
        'dept_categories.name as category_name',
        'departments.code as department_code',
        'departments.name as department_name'
      );

    if (req.user.role !== ROLES.SUPER_ADMIN) {
      query.where('dept_achievements.department_id', req.user.department_id);
    } else if (req.departmentScope) {
      query.where('dept_achievements.department_id', req.departmentScope);
    }

    if (category_id) query.where('dept_achievements.category_id', category_id);
    if (academic_year) query.where('dept_achievements.academic_year', academic_year);
    if (start_date) query.where('dept_achievements.achieved_on', '>=', start_date);
    if (end_date) query.where('dept_achievements.achieved_on', '<=', end_date);

    const rows = await query.orderBy('dept_achievements.achieved_on', 'desc');
    const shaped = shapeSingleTrackerAnalytics(rows);

    const deptMap = {};
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
      if (row.workflow_status === WORKFLOW_STATUSES.COLLEGE_APPROVED) {
        deptMap[dKey].verified_count += 1;
        deptMap[dKey].verified_score = Number(
          (deptMap[dKey].verified_score + Number(row.computed_score || 0)).toFixed(2)
        );
      }
    }

    const pendingItems = rows
      .filter((r) =>
        [WORKFLOW_STATUSES.SUBMITTED, WORKFLOW_STATUSES.UNDER_REVIEW].includes(r.workflow_status)
      )
      .slice(0, 10);

    return sendSuccess(res, {
      ...shaped,
      department_comparison: Object.values(deptMap).sort(
        (a, b) => b.verified_score - a.verified_score
      ),
      pending_items: pendingItems
    });
  } catch (err) {
    next(err);
  }
}
