//MemberModal.tsx
import { useEffect, useState } from 'react';
import type { TeamMember } from '../columntypes';

type EditableMember = {
    id?: string;
    name: string;
    color: string;
    selected: boolean;
    isNew?: boolean;
};

type Props = {
    open: boolean;
    members: TeamMember[];
    assignedMemberIds: Set<string>;
    onClose: () => void;
    onSave: (rows: EditableMember[]) => Promise<void>;
    onDelete: (ids: string[]) => Promise<void>;
};

export function MemberModal({ open, members, assignedMemberIds, onClose, onSave, onDelete }: Props) {
    const [rows, setRows] = useState<EditableMember[]>([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const selectedAssigned = rows.some((r) => r.selected && r.id && assignedMemberIds.has(r.id));
    useEffect(() => {
        if (!open) return;

        setRows(
            members.map((m) => ({
                id: m.id,
                name: m.name,
                color: m.color || '#3b82f6',
                selected: false,
            }))
        );
        setError(null);
    }, [open, members]);

    if (!open) return null;

    function addRow() {
        setRows((prev) => [
            ...prev,
            { name: '', color: '#3b82f6', selected: false, isNew: true },
        ]);
    }

    function updateRow(index: number, patch: Partial<EditableMember>) {
        setRows((prev) =>
            prev.map((row, i) => (i === index ? { ...row, ...patch } : row))
        );
    }

    function toggleSelected(index: number) {
        setRows((prev) =>
            prev.map((row, i) => (i === index ? { ...row, selected: !row.selected } : row))
        );
    }

    async function handleDeleteSelected() {
        const ids = rows.filter((r) => r.selected && r.id).map((r) => r.id!);
        if (!ids.length) return;

        setSaving(true);
        setError(null);
        try {
            await onDelete(ids);
            setRows((prev) => prev.filter((row) => !row.selected));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete members');
        } finally {
            setSaving(false);
        }
    }

    async function handleSave() {
        setSaving(true);
        setError(null);
        try {
            await onSave(rows);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save members');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal team-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <div>
                        <h2>Team Members</h2>
                    </div>

                    <button className="icon-btn" onClick={onClose} type="button">
                        ✕
                    </button>
                </div>

                <div className="modal-actions" style={{ marginBottom: 12 }}>
                    <button className="primary-btn" type="button" onClick={addRow} disabled={saving}>
                        + Add member row
                    </button>

                    <button
                        className="danger-btn"
                        type="button"
                        onClick={handleDeleteSelected}
                        disabled={saving || !rows.some((r) => r.selected && r.id) || selectedAssigned}

                    >
                        Delete Member row
                    </button>
                </div>
                {selectedAssigned ? (
                    <div className="error-box">
                        One or more selected members are assigned to tasks and cannot be deleted.
                    </div>
                ) : null}
                {error ? <div className="error-box">{error}</div> : null}

                <div className="team-table-wrap">
                    <table className="team-table">
                        <thead>
                            <tr>
                                <th />
                                <th>Avatar</th>
                                <th>Name</th>
                                <th>Color</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, index) => {
                                const isAssigned = row.id ? assignedMemberIds.has(row.id) : false;
                                return (
                                    <tr key={row.id ?? `new-${index}`} >

                                        <td>
                                            <input
                                                type="checkbox"
                                                checked={row.selected}
                                                disabled={isAssigned}
                                                onChange={() => toggleSelected(index)}
                                            />
                                        </td>

                                        <td>
                                            <div
                                                className="member-avatar-preview"
                                                style={{ backgroundColor: row.color }}
                                            >
                                                {row.name.trim() ? row.name.trim()[0].toUpperCase() : '?'}
                                            </div>
                                        </td>

                                        <td>
                                            <input
                                                className="table-input"
                                                value={row.name}
                                                onChange={(e) => updateRow(index, { name: e.target.value })}
                                                placeholder="Member name"
                                            />
                                        </td>

                                        <td>
                                            <input
                                                className="color-input"
                                                type="color"
                                                value={row.color}
                                                onChange={(e) => updateRow(index, { color: e.target.value })}
                                            />
                                        </td>
                                        <td>
                                            {isAssigned ? <span className="assigned-pill">Assigned</span> : null}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="modal-actions">
                    <span />
                    <div className="actions-right">
                        <button type="button" className="secondary-btn" onClick={onClose} disabled={saving}>
                            Cancel
                        </button>
                        <button type="button" className="success-btn" onClick={handleSave} disabled={saving}>
                            {saving ? 'Saving...' : 'Save Members'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}