import { useState } from 'react';
import { AlertCircle, Save, Send } from 'lucide-react';
import {
  ACADEMIC_YEAR_OPTIONS,
  ACHIEVEMENT_LEVEL_OPTIONS
} from '../../../shared/components/tracker/AchievementStatusBadge.jsx';
import { CollaboratorsInput } from '../../../shared/components/tracker/CollaboratorsInput.jsx';
import { CertificateOcrUpload } from '../../../shared/components/tracker/CertificateOcrUpload.jsx';
import { DuplicateWarning } from '../../../shared/components/tracker/DuplicateWarning.jsx';
import { DEPT_CATEGORY_FIELDS, validateDeptSubmission } from '../schemas/deptCategories.js';

export function DeptAchievementForm({
  mode = 'create',
  categories = [],
  departments = [],
  isSuperAdmin = false,
  initialValues = null,
  onSave,
  onCancel
}) {
  const [departmentId, setDepartmentId] = useState(
    initialValues?.department_id || departments[0]?.id || ''
  );
  const [categoryId, setCategoryId] = useState(initialValues?.category_id || '');
  const [title, setTitle] = useState(initialValues?.title || '');
  const [description, setDescription] = useState(initialValues?.description || '');
  const [achievedOn, setAchievedOn] = useState(
    initialValues?.achieved_on ? String(initialValues.achieved_on).slice(0, 10) : ''
  );
  const [achievementLevel, setAchievementLevel] = useState(
    initialValues?.achievement_level || 'national'
  );
  const [organization, setOrganization] = useState(initialValues?.organization || '');
  const [academicYear, setAcademicYear] = useState(initialValues?.academic_year || '2025-26');
  const [details, setDetails] = useState(initialValues?.details_json || {});
  const [collaborators, setCollaborators] = useState(initialValues?.collaborators_json || []);
  const [initialFile, setInitialFile] = useState(null);
  const [ocrSha256, setOcrSha256] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleOcrExtracted = (mapped) => {
    if (mapped.title && !title) setTitle(mapped.title);
    if (mapped.organization && !organization) setOrganization(mapped.organization);
    if (mapped.achieved_on && !achievedOn) setAchievedOn(mapped.achieved_on);
    if (mapped.certificate_number) {
      setDetails((prev) => ({ ...prev, certificate_number: mapped.certificate_number }));
    }
    if (mapped.sha256_hash) setOcrSha256(mapped.sha256_hash);
  };

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const extraFields = DEPT_CATEGORY_FIELDS[selectedCategory?.code] || [];

  const handleSubmit = async (submitImmediately) => {
    setError('');
    const payload = {
      ...(mode === 'create' && isSuperAdmin && departmentId ? { department_id: departmentId } : {}),
      category_id: categoryId,
      title: title.trim(),
      description: description.trim(),
      achieved_on: achievedOn,
      achievement_level: achievementLevel,
      organization: organization.trim(),
      academic_year: academicYear,
      details_json: details,
      collaborators_json: collaborators.filter((c) => c.name && c.name.trim())
    };

    const validationError = validateDeptSubmission(payload);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      await onSave(payload, { submitImmediately, initialFile });
    } catch (err) {
      setError(err.message || 'Unable to save department achievement.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <strong>
          {mode === 'create' ? 'New Department Achievement Record' : 'Edit Department Achievement'}
        </strong>
        <span className="badge badge-hod">Department Tracker Only</span>
      </div>

      <div className="card-body">
        {mode === 'create' && <CertificateOcrUpload onFieldsExtracted={handleOcrExtracted} />}
        <DuplicateWarning
          trackerDomain="department"
          title={title}
          organization={organization}
          achievedOn={achievedOn}
          certificateNumber={details?.certificate_number || ''}
          sha256Hash={ocrSha256}
          excludeAchievementId={initialValues?.id || null}
        />
        {error && (
          <div className="alert alert-error" role="alert">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit(false);
          }}
        >
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label" htmlFor="dept-cat">
                Department Category
              </label>
              <select
                id="dept-cat"
                className="form-select"
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  setDetails({});
                }}
                required
              >
                <option value="">Select department category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {mode === 'create' && isSuperAdmin ? (
              <div className="form-group">
                <label className="form-label" htmlFor="dept-target">
                  Target Department
                </label>
                <select
                  id="dept-target"
                  className="form-select"
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  required
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.code} — {d.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label" htmlFor="dept-ay">
                  Academic Year
                </label>
                <select
                  id="dept-ay"
                  className="form-select"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  required
                >
                  {ACADEMIC_YEAR_OPTIONS.map((ay) => (
                    <option key={ay} value={ay}>
                      {ay}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="dept-title">
              Achievement Title
            </label>
            <input
              id="dept-title"
              type="text"
              className="form-input"
              placeholder="e.g. NBA Tier-1 Accreditation for B.Tech CSE"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="dept-desc">
              Description
            </label>
            <textarea
              id="dept-desc"
              className="form-textarea"
              rows={4}
              placeholder="Provide institutional context, scope, and verifiable outcomes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label" htmlFor="dept-org">
                Issuing / Partner Organization
              </label>
              <input
                id="dept-org"
                type="text"
                className="form-input"
                placeholder="e.g. NBA, NIRF, AICTE, Microsoft"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="dept-level">
                Achievement Level
              </label>
              <select
                id="dept-level"
                className="form-select"
                value={achievementLevel}
                onChange={(e) => setAchievementLevel(e.target.value)}
                required
              >
                {ACHIEVEMENT_LEVEL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label" htmlFor="dept-date">
                Achievement Date
              </label>
              <input
                id="dept-date"
                type="date"
                className="form-input"
                value={achievedOn}
                onChange={(e) => setAchievedOn(e.target.value)}
                required
              />
            </div>

            {mode === 'create' && isSuperAdmin && (
              <div className="form-group">
                <label className="form-label" htmlFor="dept-ay-admin">
                  Academic Year
                </label>
                <select
                  id="dept-ay-admin"
                  className="form-select"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  required
                >
                  {ACADEMIC_YEAR_OPTIONS.map((ay) => (
                    <option key={ay} value={ay}>
                      {ay}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {extraFields.length > 0 && (
            <div className="card" style={{ marginBottom: 16, background: 'var(--color-surface-muted)' }}>
              <div className="card-body">
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>
                  {selectedCategory?.name} Details
                </div>
                <div className="form-grid-2">
                  {extraFields.map((field) => (
                    <div key={field.key} className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" htmlFor={`df-${field.key}`}>
                        {field.label}
                      </label>
                      <input
                        id={`df-${field.key}`}
                        type={field.type}
                        className="form-input"
                        placeholder={field.placeholder}
                        value={details[field.key] ?? ''}
                        onChange={(e) =>
                          setDetails((prev) => ({ ...prev, [field.key]: e.target.value }))
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <CollaboratorsInput
            value={collaborators}
            onChange={setCollaborators}
            title="Optional Collaborating Units / Partners"
            namePlaceholder="Partner institution, lab, or department unit"
            rolePlaceholder="Collaboration role"
            idPlaceholder="MoU / Reference ID"
          />

          {mode === 'create' && (
            <div className="form-group">
              <label className="form-label" htmlFor="dept-evidence-init">
                Attach Supporting Evidence Document (Optional)
              </label>
              <input
                id="dept-evidence-init"
                type="file"
                className="form-input"
                style={{ paddingTop: 7 }}
                accept=".pdf,.png,.jpg,.jpeg,.webp"
                onChange={(e) => setInitialFile(e.target.files?.[0] || null)}
              />
              <span className="form-hint">
                You can also upload additional documents on the details page before submitting.
              </span>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
            <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-secondary" disabled={submitting}>
              <Save size={15} />
              <span>{submitting ? 'Saving...' : 'Save Draft'}</span>
            </button>
            {mode === 'create' && (
              <button
                type="button"
                className="btn btn-primary"
                disabled={submitting}
                onClick={() => handleSubmit(true)}
              >
                <Send size={15} />
                <span>{submitting ? 'Submitting...' : 'Save & Submit for Approval'}</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
