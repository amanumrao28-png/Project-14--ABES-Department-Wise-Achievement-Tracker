import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Edit3, Plus } from 'lucide-react';
import { departmentsApi } from '../../../core/api/departmentsApi.js';
import { AccountStatusBadge } from '../../../shared/components/StatusBadge.jsx';
import { Modal } from '../../../shared/components/Modal.jsx';

export function DepartmentsPage() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [studentRequiresCollege, setStudentRequiresCollege] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadDepartments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const list = await departmentsApi.listDepartments();
      setDepartments(list);
    } catch (err) {
      setError(err.message || 'Failed to load departments.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  const openCreate = () => {
    setEditTarget(null);
    setCode('');
    setName('');
    setIsActive(true);
    setStudentRequiresCollege(false);
    setModalOpen(true);
  };

  const openEdit = (dept) => {
    setEditTarget(dept);
    setCode(dept.code);
    setName(dept.name);
    setIsActive(Boolean(dept.is_active));
    setStudentRequiresCollege(Boolean(dept.student_requires_college_approval));
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setFeedback('');

    try {
      if (editTarget) {
        await departmentsApi.updateDepartment(editTarget.id, {
          code: code.trim().toUpperCase(),
          name: name.trim(),
          is_active: isActive,
          student_requires_college_approval: studentRequiresCollege
        });
        setFeedback(`Department ${code.trim().toUpperCase()} updated.`);
      } else {
        await departmentsApi.createDepartment({
          code: code.trim().toUpperCase(),
          name: name.trim(),
          student_requires_college_approval: studentRequiresCollege
        });
        setFeedback(`Department ${code.trim().toUpperCase()} created.`);
      }
      setModalOpen(false);
      loadDepartments();
    } catch (err) {
      setError(err.message || 'Unable to save department.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Academic Departments</h1>
          <p className="page-subtitle">
            Manage college departments used for user assignment and strict tenant isolation.
          </p>
        </div>

        <button type="button" className="btn btn-primary" onClick={openCreate}>
          <Plus size={16} />
          <span>Add Department</span>
        </button>
      </div>

      {error && (
        <div className="alert alert-error" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {feedback && (
        <div className="alert alert-success" role="status">
          <CheckCircle2 size={18} />
          <span>{feedback}</span>
        </div>
      )}

      <div className="card">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Department Name</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: 28 }}>
                    Loading departments...
                  </td>
                </tr>
              ) : (
                departments.map((dept) => (
                  <tr key={dept.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{dept.code}</td>
                    <td>{dept.name}</td>
                    <td>
                      <AccountStatusBadge isActive={dept.is_active} />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => openEdit(dept)}
                      >
                        <Edit3 size={13} />
                        <span>Edit</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={modalOpen}
        title={editTarget ? `Edit Department — ${editTarget.code}` : 'Create Department'}
        onClose={() => !submitting && setModalOpen(false)}
        maxWidth={460}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="dept-code">
              Department Code
            </label>
            <input
              id="dept-code"
              type="text"
              className="form-input"
              maxLength={10}
              placeholder="e.g. AIML"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="dept-name">
              Department Name
            </label>
            <input
              id="dept-name"
              type="text"
              className="form-input"
              placeholder="e.g. Artificial Intelligence & Machine Learning"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={studentRequiresCollege}
                onChange={(e) => setStudentRequiresCollege(e.target.checked)}
              />
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>
                  Require College Management Final Approval for Student Achievements
                </div>
                <div className="form-hint">
                  When unchecked, HOD may grant final verified status for student achievements in
                  this department. When checked, Super Admin final sign-off is required.
                </div>
              </div>
            </label>
          </div>

          {editTarget && (
            <div className="form-group">
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>Department Active</div>
                  <div className="form-hint">Inactive departments are hidden for new assignments.</div>
                </div>
              </label>
            </div>
          )}

          <div className="modal-footer" style={{ margin: '0 -22px -22px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : editTarget ? 'Save Changes' : 'Create Department'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
