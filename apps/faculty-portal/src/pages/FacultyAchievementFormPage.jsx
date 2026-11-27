import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '@shared/auth/AuthContext.jsx';
import { ROLES } from '@shared/constants/roles.js';
import { facultyTrackerApi } from '@shared/api/facultyTrackerApi.js';
import { FacultyAchievementForm } from '../components/FacultyAchievementForm.jsx';
import { EvidenceDocumentsPanel } from '@shared/components/tracker/EvidenceDocumentsPanel.jsx';

export function FacultyAchievementFormPage({ mode = 'create' }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const basePath = '/my-achievements';

  const [categories, setCategories] = useState([]);
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [cats, existing] = await Promise.all([
          facultyTrackerApi.listCategories(),
          mode === 'edit' && id ? facultyTrackerApi.getById(id) : Promise.resolve(null)
        ]);
        if (!active) return;
        setCategories(cats);
        setRecord(existing);
      } catch (err) {
        if (active) setError(err.message || 'Unable to load faculty achievement form.');
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [mode, id]);

  const handleSave = async (payload, { submitImmediately, initialFile }) => {
    if (mode === 'create') {
      const created = await facultyTrackerApi.create(payload);
      if (initialFile) {
        await facultyTrackerApi.uploadDocument(created.id, initialFile);
      }
      if (submitImmediately) {
        await facultyTrackerApi.submit(created.id);
      }
      navigate(`${basePath}/${created.id}`, { replace: true });
    } else {
      await facultyTrackerApi.update(id, payload);
      navigate(`${basePath}/${id}`, { replace: true });
    }
  };

  if (loading) {
    return <div className="card card-body">Loading faculty achievement form...</div>;
  }

  if (error) {
    return (
      <div className="alert alert-error">
        <AlertCircle size={18} />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <Link to={basePath} className="btn btn-ghost btn-sm">
          <ArrowLeft size={15} />
          <span>Back to Faculty Achievements</span>
        </Link>
      </div>

      <FacultyAchievementForm
        mode={mode}
        categories={categories}
        initialValues={record}
        onSave={handleSave}
        onCancel={() => navigate(mode === 'edit' ? `${basePath}/${id}` : basePath)}
      />

      {mode === 'edit' && record && (
        <EvidenceDocumentsPanel
          title="Certificates & Verification Proofs"
          documents={record.evidence_documents || []}
          canModify={
            record.workflow_status === 'draft' || record.workflow_status === 'changes_requested'
          }
          onUpload={async (file) => {
            await facultyTrackerApi.uploadDocument(record.id, file);
            const refreshed = await facultyTrackerApi.getById(record.id);
            setRecord(refreshed);
          }}
          onDownload={(doc) =>
            facultyTrackerApi.downloadDocument(record.id, doc.id, doc.original_filename)
          }
          onDelete={async (doc) => {
            await facultyTrackerApi.deleteDocument(record.id, doc.id);
            const refreshed = await facultyTrackerApi.getById(record.id);
            setRecord(refreshed);
          }}
        />
      )}
    </div>
  );
}
