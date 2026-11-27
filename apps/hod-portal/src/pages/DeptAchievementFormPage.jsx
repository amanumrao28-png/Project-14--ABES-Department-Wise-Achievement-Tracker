import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '@shared/auth/AuthContext.jsx';
import { ROLES } from '@shared/constants/roles.js';
import { deptTrackerApi } from '@shared/api/deptTrackerApi.js';
import { departmentsApi } from '@shared/api/departmentsApi.js';
import { DeptAchievementForm } from '../components/DeptAchievementForm.jsx';
import { EvidenceDocumentsPanel } from '@shared/components/tracker/EvidenceDocumentsPanel.jsx';

export function DeptAchievementFormPage({ mode = 'create' }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === ROLES.SUPER_ADMIN;
  const basePath = '/achievements';

  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [cats, depts, existing] = await Promise.all([
          deptTrackerApi.listCategories(),
          isSuperAdmin ? departmentsApi.listDepartments({ is_active: true }) : Promise.resolve([]),
          mode === 'edit' && id ? deptTrackerApi.getById(id) : Promise.resolve(null)
        ]);
        if (!active) return;
        setCategories(cats);
        setDepartments(depts);
        setRecord(existing);
      } catch (err) {
        if (active) setError(err.message || 'Unable to load form data.');
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [mode, id, isSuperAdmin]);

  const handleSave = async (payload, { submitImmediately, initialFile }) => {
    if (mode === 'create') {
      const created = await deptTrackerApi.create(payload);
      if (initialFile) {
        await deptTrackerApi.uploadDocument(created.id, initialFile);
      }
      if (submitImmediately) {
        await deptTrackerApi.submit(created.id);
      }
      navigate(`${basePath}/${created.id}`, { replace: true });
    } else {
      await deptTrackerApi.update(id, payload);
      navigate(`${basePath}/${id}`, { replace: true });
    }
  };

  if (loading) {
    return <div className="card card-body">Loading department achievement form...</div>;
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
          <span>Back to Department Achievements</span>
        </Link>
      </div>

      <DeptAchievementForm
        mode={mode}
        categories={categories}
        departments={departments}
        isSuperAdmin={isSuperAdmin}
        initialValues={record}
        onSave={handleSave}
        onCancel={() => navigate(mode === 'edit' ? `${basePath}/${id}` : basePath)}
      />

      {mode === 'edit' && record && (
        <EvidenceDocumentsPanel
          documents={record.evidence_documents || []}
          canModify={
            record.workflow_status === 'draft' || record.workflow_status === 'changes_requested'
          }
          onUpload={async (file) => {
            await deptTrackerApi.uploadDocument(record.id, file);
            const refreshed = await deptTrackerApi.getById(record.id);
            setRecord(refreshed);
          }}
          onDownload={(doc) =>
            deptTrackerApi.downloadDocument(record.id, doc.id, doc.original_filename)
          }
          onDelete={async (doc) => {
            await deptTrackerApi.deleteDocument(record.id, doc.id);
            const refreshed = await deptTrackerApi.getById(record.id);
            setRecord(refreshed);
          }}
        />
      )}
    </div>
  );
}
