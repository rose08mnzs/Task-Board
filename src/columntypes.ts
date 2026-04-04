//columntypes.ts
export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done';

export type TaskPriority = 'low' | 'normal' | 'high';

export const STATUS_COLUMNS: { id: TaskStatus; label: string }[] = [
    { id: 'todo', label: 'To Do' },
    { id: 'in_progress', label: 'In Progress' },
    { id: 'in_review', label: 'In Review' },
    { id: 'done', label: 'Done' },
];

export type TeamMember = {
    id: string;
    name: string;
    color: string | null;
};
export type TaskComment = {
    id: string;
    task_id: string;
    user_id: string;
    content: string;
    created_at: string;
};
export type TaskActivity = {
    id: string;
    task_id: string;
    user_id: string;
    action: string;
    created_at: string;
};
export type TaskLabel = {
    id: string;
    task_id: string;
    user_id: string;
    name: string;
    color: string;
    created_at: string;
};
export type Task = {
    id: string;
    title: string;
    description: string | null;
    status: TaskStatus;
    priority: TaskPriority;
    due_date: string | null;
    user_id: string;
    created_at: string;
    assignees?: TeamMember[];
    team_members?: TeamMember;
    labels?: TaskLabel[];
};
