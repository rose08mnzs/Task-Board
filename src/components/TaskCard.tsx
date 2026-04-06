//TaskCard.tsx
import { useDraggable } from '@dnd-kit/core';
import type { Task } from '../columntypes';
import * as Helper from './HelperFile';
function getPriorityClass(priority: Task['priority']) {
    if (priority === 'high') return 'priority high';
    if (priority === 'low') return 'priority low';
    return 'priority normal';
}
function getPriorityClassTaskCardName(priority: Task['priority']) {
    if (priority === 'high') return 'task-card-high';
    if (priority === 'low') return 'task-card-low';
    return 'task-card-normal';
}
type CardViewProps = {
    task: Task;
    onClick?: (task: Task) => void;
    dragging?: boolean;
};
function getDueStatus(dueDate?: string | null) {
    if (!dueDate) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const due = Helper.parseDate(dueDate);
    due.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
        return { label: 'Overdue', className: 'due-overdue' };
    }

    if (diffDays === 0) {
        return { label: 'Due today', className: 'due-today' };
    }

    if (diffDays <= 2) {
        return { label: `Due in ${diffDays}d`, className: 'due-soon' };
    }

    return { label: `Due in ${diffDays}d`, className: 'due-future' };
}
export function TaskCardView({ task, onClick, dragging = false }: CardViewProps) {
    const dueStatus = getDueStatus(task.due_date);
    return (
        <div
            //className={`task-card ${dragging ? 'dragging' : ''}`}
            className={`${getPriorityClassTaskCardName(task.priority)} ${dragging ? 'dragging' : ''}`}
            onClick={() => onClick?.(task)}
        >
            <div className="task-card-top">
                <div className="task-card-top-left">
                    <span className={getPriorityClass(task.priority)}>{task.priority}</span>
                    {task.due_date ? (
                        <span className="due-date">{Helper.formatDueDate(task.due_date)}</span>
                    ) : null}
                </div>
                {dueStatus ? (
                    <span className={`due-badge ${dueStatus.className}`}>
                        {dueStatus.label}
                    </span>
                ) : null}
            </div>
            <h3>{task.title}</h3>
            {task.description ? <p>{task.description}</p> : <p className="muted">No description</p>}
            {(task.labels ?? []).length > 0 ? (
                <div className="label-stack">
                    {(task.labels ?? []).map((label) => (
                        <span
                            key={label.id}
                            className="task-label"
                        //style={{ backgroundColor: label.color }}
                        >
                            {label.name}
                        </span>
                    ))}
                </div>
            ) : null}
            {(task.assignees ?? []).length > 0 ? (
                <div className="assignee-stack">
                    {(task.assignees ?? []).slice(0, 3).map((member) => (
                        <div
                            key={member.id}
                            className="avatar"
                            style={{
                                background: member.color || '#3b82f6',
                                borderRadius: '50%',
                                width: 28,
                                height: 28,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 12,
                                color: '#fff',
                            }}
                            title={member.name}
                        >
                            {member.name[0].toUpperCase()}
                        </div>
                    ))}
                </div>
            ) : null}

        </div>
    );
}

type Props = {
    task: Task;
    onClick: (task: Task) => void;
};

export function TaskCard({ task, onClick }: Props) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: task.id,
    });

    const style: React.CSSProperties = {
        transform: transform
            ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
            : undefined,
        opacity: isDragging ? 0.15 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
            <TaskCardView task={task} onClick={onClick} dragging={isDragging} />
        </div>
    );
}