/// TaskModal.tsx
import { useEffect, useState } from 'react';
import type { Task, TaskPriority, TaskStatus, TeamMember, TaskComment, TaskActivity, TaskLabel, Label } from '../columntypes';
import * as Helper from './HelperFile';

type FormState = {
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    due_date: string;
    assignee_ids: string[];
    label_names: string[];
};

type Props = {
    open: boolean;
    task: Task | null;
    teamMembers: TeamMember[];
    onClose: () => void;
    onSave: (data: FormState, taskId?: string) => Promise<void>;
    onDelete: (taskId: string) => Promise<void>;
    comments: TaskComment[];
    commentText: string;
    commentLoading: boolean;
    commentSaving: boolean;
    onCommentTextChange: (value: string) => void;
    onAddComment: (taskId: string) => Promise<void>;
    activity: TaskActivity[];
};
const today = new Date().toISOString().split('T')[0];
const initialState: FormState = {
    title: '',
    description: '',
    status: 'todo',
    priority: 'normal',
    due_date: '',
    assignee_ids: [],
    label_names: [],

};

export function TaskModal({ open,
    task,
    teamMembers,
    onClose,
    onSave,
    onDelete,
    comments,
    commentText,
    commentLoading,
    commentSaving,
    onCommentTextChange,
    onAddComment,
    activity, }: Props) {
    const [form, setForm] = useState<FormState>(initialState);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [assigneeSearch, setAssigneeSearch] = useState('');
    const [labelInput, setLabelInput] = useState('');
    const selectedMembers = teamMembers.filter((m) =>
        form.assignee_ids.includes(m.id)
    );

    const filteredMembers = teamMembers.filter((m) =>
        m.name.toLowerCase().includes(assigneeSearch.toLowerCase())
    );
    useEffect(() => {
        if (task) {
            setForm({
                title: task.title,
                description: task.description ?? '',
                status: task.status,
                priority: task.priority,
                due_date: task.due_date ?? '',
                assignee_ids: (task.assignees ?? []).map((member) => member.id),
                label_names: (task.labels ?? []).map((label) => label.name),
            });
        } else {
            setForm(initialState);
        }
        setAssigneeSearch('');
        setLabelInput('');
        setError(null);
    }, [task, open]);

    if (!open) return null;
    function toggleAssignee(memberId: string) {
        setForm((prev) => {
            const exists = prev.assignee_ids.includes(memberId);
            return {
                ...prev,
                assignee_ids: exists
                    ? prev.assignee_ids.filter((id) => id !== memberId)
                    : [...prev.assignee_ids, memberId],
            };
        });
    }
    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        setError(null);

        try {
            await onSave(form, task?.id);
            //onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save task');
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete() {
        if (!task) return;

        const confirmed = window.confirm(
            `Are you sure you want to delete "${task.title}"? This cannot be undone.`
        );

        if (!confirmed) return;

        setSaving(true);
        setError(null);

        try {
            await onDelete(task.id);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete task');
        } finally {
            setSaving(false);
        }
    }
    function addLabelFromInput() {
        const value = labelInput.trim();
        if (!value) return;

        setForm((prev) => {
            const exists = prev.label_names.some(
                (label) => label.toLowerCase() === value.toLowerCase()
            );

            if (exists) return prev;

            return {
                ...prev,
                label_names: [...prev.label_names, value],
            };
        });

        setLabelInput('');
    }

    function removeLabel(name: string) {
        setForm((prev) => ({
            ...prev,
            label_names: prev.label_names.filter(
                (label) => label.toLowerCase() !== name.toLowerCase()
            ),
        }));
    }
    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <div>
                        <h2 >{task ? 'Edit Task' : 'New Task'}</h2>
                    </div>
                    <button className="icon-btn" onClick={onClose}>✕</button>
                </div>

                <form onSubmit={handleSubmit} className="modal-form">
                    <label><span className="label-text">
                        <span className="required" style={{ color: 'red' }}>*</span> Title
                    </span>
                        <input
                            value={form.title}
                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                            placeholder="Add a task title"
                            required
                        />
                    </label>

                    <label>
                        Description
                        <textarea
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            placeholder="Description"
                            rows={4}
                        />
                    </label>

                    <div className="grid-2">
                        <label>
                            <span className="label-text">
                                <span className="required" style={{ color: 'red' }}>*</span> Status
                            </span>
                            <select
                                value={form.status}
                                onChange={(e) => setForm({ ...form, status: e.target.value as TaskStatus })}
                            >
                                <option value="todo">To Do</option>
                                <option value="in_progress">In Progress</option>
                                <option value="in_review">In Review</option>
                                <option value="done">Done</option>
                            </select>
                        </label>

                        <label>
                            <span className="label-text">
                                <span className="required" style={{ color: 'red' }}>*</span> Priority
                            </span>

                            <select
                                value={form.priority}
                                onChange={(e) => setForm({ ...form, priority: e.target.value as TaskPriority })}
                            >
                                <option value="low">Low</option>
                                <option value="normal">Normal</option>
                                <option value="high">High</option>
                            </select>
                        </label>
                    </div>
                    <label>
                        Due Date

                        <input
                            type="date"
                            value={form.due_date}
                            onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                        />
                    </label>
                    <label>
                        Team Members

                        <div className="assignee-combobox">
                            <input
                                className="assignee-input"
                                type="text"
                                placeholder="Search members..."
                                value={assigneeSearch}
                                onChange={(e) => setAssigneeSearch(e.target.value)}
                            />

                            {selectedMembers.length > 0 ? (
                                <div className="assignee-chips">
                                    {selectedMembers.map((member) => (
                                        <span key={member.id} className="assignee-chip">
                                            <span
                                                className="chip-avatar"
                                                style={{ backgroundColor: member.color || '#3b82f6' }}
                                            >
                                                {member.name[0].toUpperCase()}
                                            </span>
                                            {member.name}
                                            <button
                                                type="button"
                                                className="chip-remove"
                                                onClick={() => toggleAssignee(member.id)}
                                                aria-label={`Remove ${member.name}`}
                                            >
                                                ×
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            ) : null}

                            <div className="assignee-dropdown">
                                <div className="assignee-scroll">
                                {filteredMembers.length === 0 ? (
                                    <div className="dropdown-empty">No members found</div>
                                ) : (
                                    filteredMembers.map((member) => {
                                        const checked = form.assignee_ids.includes(member.id);

                                        return (
                                            <label key={member.id} className="assignee-option">
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={() => toggleAssignee(member.id)}
                                                />

                                                <span
                                                    className="chip-avatar"
                                                    style={{ backgroundColor: member.color || '#3b82f6' }}
                                                >
                                                    {member.name[0].toUpperCase()}

                                                </span>

                                                <span>{member.name}</span>
                                            </label>
                                        );
                                    })
                                )}
                                </div>
                            </div>
                        </div>
                    </label>

                    <label>
                        Labels
                        {form.label_names.length > 0 ? (
                            <div className="label-chips">
                                {form.label_names.map((name) => (
                                    <span key={name} className="label-chip">
                                        {name}
                                        <button
                                            type="button"
                                            className="chip-remove"
                                            onClick={() => removeLabel(name)}
                                            aria-label={`Remove ${name}`}
                                        >
                                            ×
                                        </button>
                                    </span>
                                ))}
                            </div>
                        ) : null}
                        <div className="label-combobox">
                            <input
                                className="label-input"
                                type="text"
                                placeholder="Type a label and press Enter..."
                                value={labelInput}
                                onChange={(e) => setLabelInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        addLabelFromInput();
                                    }
                                }}
                            />

                            
                        </div>
                    </label>



                    {error ? <div className="error-box">{error}</div> : null}
                    <div></div>
                    <div className="modal-actions">
                        {task ? (
                            <button
                                type="button"
                                className="danger-btn"
                                onClick={handleDelete}
                                disabled={saving}
                            >
                                Delete Task
                            </button>
                        ) : (
                            <span />
                        )}

                        <div className="actions-right">
                            <button type="button" className="secondary-btn" onClick={onClose} disabled={saving}>
                                Cancel
                            </button>
                            <button type="submit" className="success-btn" disabled={saving}>
                                {saving ? (
                                    <>
                                        <span className="spinner" style={{ marginRight: 8 }} />
                                        Saving...
                                    </>
                                ) : (
                                    'Save Task'
                                )}
                            </button>
                        </div>

                    </div>


                    <div className="comments-section">
                        <h2>Comments</h2>

                        {commentLoading ? (
                            <div className="muted">Loading comments...</div>
                        ) : comments.length === 0 ? (
                            <div className="muted">No comments yet</div>
                        ) : (
                            <div className="comments-list">
                                {comments.map((comment) => (
                                    <div key={comment.id} className="comment-item">
                                        <div className="comment-meta">
                                            <span className="comment-time">
                                                {Helper.formatDueDateUserFriendly(comment.created_at)}
                                            </span>
                                        </div>
                                        <p>{comment.content}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {task ? (
                            <div className="comment-form">
                                <textarea
                                    value={commentText}
                                    onChange={(e) => onCommentTextChange(e.target.value)}
                                    placeholder="Write a comment..."
                                    rows={3}
                                />
                                <button
                                    type="button"
                                    className="primary-btn"
                                    disabled={commentSaving || !commentText.trim()}
                                    onClick={() => onAddComment(task.id)}
                                >
                                    {commentSaving ? (
                                        <>
                                            <span className="spinner" style={{ marginRight: 8 }} />
                                            Posting...
                                        </>
                                    ) : (
                                        'Post comment'
                                    )}
                                </button>
                            </div>
                        ) : null}
                    </div>
                    <div className="activity-section">
                        <h2>Activity Logs</h2>

                        {activity.length === 0 ? (
                            <div className="muted">No activity yet</div>
                        ) : (
                            <div className="activity-list">
                                {activity.map((item) => (
                                    <div key={item.id} className="activity-item">
                                        <div className="activity-dot" />
                                        <div>
                                            <p className="activity-text">{item.action}</p>
                                            <span className="activity-time">
                                                {Helper.formatDueDateUserFriendly(item.created_at)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>


                </form>
            </div>
        </div >
    );
}

