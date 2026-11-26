import { useState } from 'react';
import { AlertCircle, Save, Send } from 'lucide-react';
import {
  ACADEMIC_YEAR_OPTIONS,
  ACHIEVEMENT_LEVEL_OPTIONS
} from '../../../shared/components/tracker/AchievementStatusBadge.jsx';
import { CollaboratorsInput } from '../../../shared/components/tracker/CollaboratorsInput.jsx';
import { CertificateOcrUpload } from '../../../shared/components/tracker/CertificateOcrUpload.jsx';
import { DuplicateWarning } from '../../../shared/components/tracker/DuplicateWarning.jsx';
import { FACULTY_CATEGORY_FIELDS, validateFacultySubmission } from '../schemas/facultyCategories.js';

export function FacultyAchievementForm({
  mode = 'create',
  categories = [],
  initialValues = null,
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
    initialValues?.achievement_level || 'international'
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
  const extraFields = FACULTY_CATEGORY_FIELDS[selectedCategory?.code] || [];

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

    const validationError = validateFacultySubmission(payload);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      await onSave(payload, { submitImmediately, initialFile });
    } catch (err) {
      setError(err.message || 'Unable to save faculty achievement.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <strong>
          {mode === 'create'
            ? 'Submit Personal Faculty Achievement'
            : 'Edit Personal Faculty Achievement'}
        </strong>
        <span className="badge badge-faculty">Faculty Tracker Only</span>
      </div>

      <div className="card-body">
        {mode === 'create' && <CertificateOcrUpload onFieldsExtracted={handleOcrExtracted} />}
        <DuplicateWarning
          trackerDomain="faculty"
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
              <label className="form-label" htmlFor="fac-cat">
                Faculty Category
              </label>
              <select
                id="fac-cat"
                className="form-select"
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  setDetails({});
                }}
                required
              >
                <option value="">Select faculty category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="fac-ay">
                Academic Year
              </label>
              <select
                id="fac-ay"
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
            <label className="form-label" htmlFor="fac-title">
              Achievement Title
            </label>
            <input
              id="fac-title"
              type="text"
              className="form-input"
              placeholder="e.g. Deep Learning Optimization for Edge IoT Nodes"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="fac-desc">
              Description
            </label>
            <textarea
              id="fac-desc"
              className="form-textarea"
              rows={4}
              placeholder="Describe publication abstract, patent claims, FDP curriculum, or grant objectives..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label" htmlFor="fac-org">
                Organization / Publisher / Sponsor
              </label>
              <input
                id="fac-org"
                type="text"
                className="form-input"
                placeholder="e.g. IEEE, Springer, DST, NPTEL, IIT Delhi"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="fac-level">
                Achievement Level
              </label>
              <select
                id="fac-level"
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
            <label className="form-label" htmlFor="fac-date">
              Achievement Date
            </label>
            <input
              id="fac-date"
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
                  {selectedCategory?.name} Metadata
                </div>
                <div className="form-grid-2">
                  {extraFields.map((field) => (
                    <div key={field.key} className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" htmlFor={`ff-${field.key}`}>
                        {field.label}
                      </label>
                      <input
                        id={`ff-${field.key}`}
                        type={field.type}
                        step="any"
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
            title="Optional Co-Authors / Co-Investigators"
            namePlaceholder="Co-author or collaborator name"
            rolePlaceholder="Role (1st Author, Co-Author, Co-PI)"
            idPlaceholder="Faculty ID / Affiliation"
          />

          {mode === 'create' && (
            <div className="form-group">
              <label className="form-label" htmlFor="fac-cert-init">
                Upload Certificate / Proof Document (Optional)
              </label>
              <input
                id="fac-cert-init"
                type="file"
                className="form-input"
                style={{ paddingTop: 7 }}
                accept=".pdf,.png,.jpg,.jpeg,.webp"
                onChange={(e) => setInitialFile(e.target.files?.[0] || null)}
              />
              <span className="form-hint">
                Upload PDF or image certificate (max 10 MB). Additional files can be attached before submission.
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
                <span>{submitting ? 'Submitting...' : 'Submit for Verification'}</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
