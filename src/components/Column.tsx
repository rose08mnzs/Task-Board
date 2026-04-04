//Column.tsx
import { useDroppable } from '@dnd-kit/core';
import type { Task, TaskStatus } from '../columntypes';
import { TaskCard } from './TaskCard';

type Props = {
    id: TaskStatus;
    title: string;
    tasks: Task[];
    onTaskClick: (task: Task) => void;
};

export function Column({ id, title, tasks, onTaskClick }: Props) {
    const { setNodeRef, isOver } = useDroppable({
        id,
    });

    return (
        <section ref={setNodeRef} className={`column ${isOver ? 'over' : ''}`}>
            <div className="column-header">
                <h2>{title}</h2>
                <span className="count">{tasks.length}</span>
            </div>

            <div className="column-body">
                {tasks.length === 0 ? (
                    <div className="empty-state">Drop tasks here</div>
                ) : (
                    tasks.map((task) => <TaskCard key={task.id} task={task} onClick={onTaskClick} />)
                )}
            </div>
        </section>
    );
}