import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '@shared/auth/AuthContext.jsx';
import { ROLES } from '@shared/constants/roles.js';
import { studentTrackerApi } from '@shared/api/studentTrackerApi.js';
import { StudentAchievementForm } from '../components/StudentAchievementForm.jsx';
import { EvidenceDocumentsPanel } from '@shared/components/tracker/EvidenceDocumentsPanel.jsx';

export function StudentAchievementFormPage({ mode = 'create' }) {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const defaultCategoryCode = searchParams.get('preset') || '';
  const basePath =
    user?.role === ROLES.SUPER_ADMIN
      ? '/students'
      : '/students';

  const [categories, setCategories] = useState([]);
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [cats, existing] = await Promise.all([
          studentTrackerApi.listCategories(),
          mode === 'edit' && id ? studentTrackerApi.getById(id) : Promise.resolve(null)
        ]);
        if (!active) return;
        setCategories(cats);
        setRecord(existing);
      } catch (err) {
        if (active) setError(err.message || 'Unable to load student achievement form.');
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
      const created = await studentTrackerApi.create(payload);
      if (initialFile) {
        await studentTrackerApi.uploadDocument(created.id, initialFile);
      }
      if (submitImmediately) {
        await studentTrackerApi.submit(created.id);
      }
      navigate(`${basePath}/${created.id}`, { replace: true });
    } else {
      await studentTrackerApi.update(id, payload);
      navigate(`${basePath}/${id}`, { replace: true });
    }
  };

  if (loading) {
    return <div className="card card-body">Loading student achievement form...</div>;
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
          <span>Back to My Student Achievements</span>
        </Link>
      </div>

      <StudentAchievementForm
        mode={mode}
        categories={categories}
        initialValues={record}
        defaultCategoryCode={defaultCategoryCode}
        onSave={handleSave}
        onCancel={() => navigate(mode === 'edit' ? `${basePath}/${id}` : basePath)}
      />

      {mode === 'edit' && record && (
        <EvidenceDocumentsPanel
          title="Certificates & Offer Proofs"
          documents={record.evidence_documents || []}
          canModify={
            record.workflow_status === 'draft' || record.workflow_status === 'changes_requested'
          }
          onUpload={async (file) => {
            await studentTrackerApi.uploadDocument(record.id, file);
            const refreshed = await studentTrackerApi.getById(record.id);
            setRecord(refreshed);
          }}
          onDownload={(doc) =>
            studentTrackerApi.downloadDocument(record.id, doc.id, doc.original_filename)
          }
          onDelete={async (doc) => {
            await studentTrackerApi.deleteDocument(record.id, doc.id);
            const refreshed = await studentTrackerApi.getById(record.id);
            setRecord(refreshed);
          }}
        />
      )}
    </div>
  );
}
