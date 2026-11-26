import { useEffect, useState } from 'react';
import { AlertCircle, Save, Send } from 'lucide-react';
import {
  ACADEMIC_YEAR_OPTIONS,
  ACHIEVEMENT_LEVEL_OPTIONS
} from '../../../shared/components/tracker/AchievementStatusBadge.jsx';
import { CollaboratorsInput } from '../../../shared/components/tracker/CollaboratorsInput.jsx';
import { CertificateOcrUpload } from '../../../shared/components/tracker/CertificateOcrUpload.jsx';
import { DuplicateWarning } from '../../../shared/components/tracker/DuplicateWarning.jsx';
import { STUDENT_CATEGORY_FIELDS, validateStudentSubmission } from '../schemas/studentCategories.js';

export function StudentAchievementForm({
  mode = 'create',
  categories = [],
  initialValues = null,
  defaultCategoryCode = '',
  onSave,
  onCancel
}) {
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

  useEffect(() => {
    if (mode === 'create' && !categoryId && defaultCategoryCode && categories.length > 0) {
      const match = categories.find((c) => c.code === defaultCategoryCode);
      if (match) setCategoryId(match.id);
    }
  }, [mode, categoryId, defaultCategoryCode, categories]);

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const extraFields = STUDENT_CATEGORY_FIELDS[selectedCategory?.code] || [];

  const handleSubmit = async (submitImmediately) => {
    setError('');
    const payload = {
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

    const validationError = validateStudentSubmission(payload);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      await onSave(payload, { submitImmediately, initialFile });
    } catch (err) {
      setError(err.message || 'Unable to save student achievement.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <strong>
          {mode === 'create'
            ? 'Submit Student Achievement'
            : 'Edit Student Achievement'}
        </strong>
        <span className="badge badge-student">Student Tracker Only</span>
      </div>

      <div className="card-body">
        {mode === 'create' && <CertificateOcrUpload onFieldsExtracted={handleOcrExtracted} />}
        <DuplicateWarning
          trackerDomain="student"
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
              <label className="form-label" htmlFor="stu-cat">
                Student Category
              </label>
              <select
                id="stu-cat"
                className="form-select"
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  setDetails({});
                }}
                required
              >
                <option value="">Select student category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="stu-ay">
                Academic Year
              </label>
              <select
                id="stu-ay"
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
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="stu-title">
              Achievement Title
            </label>
            <input
              id="stu-title"
              type="text"
              className="form-input"
              placeholder="e.g. Smart India Hackathon National Winner / Google SWE Internship"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="stu-desc">
              Description
            </label>
            <textarea
              id="stu-desc"
              className="form-textarea"
              rows={4}
              placeholder="Describe your achievement, project outcome, role responsibilities, or competition track..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label" htmlFor="stu-org">
                Company / Organizer / Institution
              </label>
              <input
                id="stu-org"
                type="text"
                className="form-input"
                placeholder="e.g. MoE Innovation Cell, Amazon, Microsoft, IIT Kanpur"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="stu-level">
                Achievement Level
              </label>
              <select
                id="stu-level"
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

          <div className="form-group" style={{ maxWidth: 280 }}>
            <label className="form-label" htmlFor="stu-date">
              Achievement Date
            </label>
            <input
              id="stu-date"
              type="date"
              className="form-input"
              value={achievedOn}
              onChange={(e) => setAchievedOn(e.target.value)}
              required
            />
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
                      <label className="form-label" htmlFor={`sf-${field.key}`}>
                        {field.label}
                      </label>
                      <input
                        id={`sf-${field.key}`}
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
            title="Optional Team Members / Collaborators"
            namePlaceholder="Teammate full name"
            rolePlaceholder="Role (Team Lead, Backend, ML)"
            idPlaceholder="Roll No (optional)"
          />

          {mode === 'create' && (
            <div className="form-group">
              <label className="form-label" htmlFor="stu-cert-init">
                Upload Certificate / Offer Letter (Optional)
              </label>
              <input
                id="stu-cert-init"
                type="file"
                className="form-input"
                style={{ paddingTop: 7 }}
                accept=".pdf,.png,.jpg,.jpeg,.webp"
                onChange={(e) => setInitialFile(e.target.files?.[0] || null)}
              />
              <span className="form-hint">
                Attach official PDF or image certificate/offer letter (max 10 MB).
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
                <span>{submitting ? 'Submitting...' : 'Submit for Approval'}</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
