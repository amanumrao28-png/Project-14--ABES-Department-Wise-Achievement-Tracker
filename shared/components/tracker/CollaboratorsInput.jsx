import { Plus, Trash2 } from 'lucide-react';

/**
 * Pure visual repeatable collaborator editor configured per tracker domain.
 */
export function CollaboratorsInput({
  value = [],
  onChange,
  title = 'Optional Collaborators',
  namePlaceholder = 'Collaborator / Co-author name',
  rolePlaceholder = 'Role (e.g. Co-Author, Team Member)',
  idPlaceholder = 'Employee / Roll No (optional)'
}) {
  const handleAdd = () => {
    onChange([...value, { name: '', role: '', identifier: '' }]);
  };

  const handleUpdate = (index, field, nextVal) => {
    const next = value.map((item, i) => (i === index ? { ...item, [field]: nextVal } : item));
    onChange(next);
  };

  const handleRemove = (index) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className="form-group">
      <div className="form-label">
        <span>{title}</span>
        <button type="button" className="btn btn-secondary btn-sm" onClick={handleAdd}>
          <Plus size={13} />
          <span>Add Collaborator</span>
        </button>
      </div>

      {value.length === 0 ? (
        <div className="form-hint">
          No collaborators added. Click &ldquo;Add Collaborator&rdquo; if applicable.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {value.map((row, idx) => (
            <div key={idx} className="collaborator-row">
              <input
                type="text"
                className="form-input"
                placeholder={namePlaceholder}
                value={row.name || ''}
                onChange={(e) => handleUpdate(idx, 'name', e.target.value)}
                required
              />
              <input
                type="text"
                className="form-input"
                placeholder={rolePlaceholder}
                value={row.role || ''}
                onChange={(e) => handleUpdate(idx, 'role', e.target.value)}
              />
              <input
                type="text"
                className="form-input"
                placeholder={idPlaceholder}
                value={row.identifier || ''}
                onChange={(e) => handleUpdate(idx, 'identifier', e.target.value)}
              />
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => handleRemove(idx)}
                aria-label="Remove collaborator"
              >
                <Trash2 size={15} color="var(--color-danger)" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
