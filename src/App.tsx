//app.tsx
import { useEffect, useMemo, useState, useRef } from 'react';
import {
    DndContext,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    closestCenter,
    type DragStartEvent,
    type DragEndEvent,
} from '@dnd-kit/core';
import { supabase } from './lib/supabaseClient';
import type { Task, TaskStatus, TeamMember, TaskComment, TaskActivity, TaskLabel, Label, TaskPriority } from './columntypes';
import { STATUS_COLUMNS } from './columntypes';
import { Column } from './components/Column';
import { TaskModal } from './components/TaskModal';
import { MemberModal } from './components/MemberModal';
import * as Helper from './components/HelperFile';


type FormState = {
    title: string;
    description: string;
    status: TaskStatus;
    priority: 'low' | 'normal' | 'high';
    due_date: string;
    assignee_ids: string[];
    label_names?: string[];
};
type EditableMember = {
    id?: string;
    name: string;
    color: string;
    selected: boolean;
    isNew?: boolean;
};
type TaskAssigneeRow = {
    task_id: string;
    team_member_id: string;
};
export default function App() {
    const [initOnce, setInitOnce] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [activeTask, setActiveTask] = useState<Task | null>(null);
    const [teamModalOpen, setTeamModalOpen] = useState(false);
    const [comments, setComments] = useState<TaskComment[]>([]);
    const [commentText, setCommentText] = useState('');
    const [commentLoading, setCommentLoading] = useState(false);
    const [commentSaving, setCommentSaving] = useState(false);
    const [activity, setActivity] = useState<TaskActivity[]>([]);

    const [priorityFilter, setPriorityFilter] = useState<'all' | TaskPriority>('all');
    const [assigneeFilter, setAssigneeFilter] = useState<'all' | string>('all');
    const [labelFilter, setLabelFilter] = useState<'all' | string>('all');
    const assignedMemberIds = useMemo(() => {
        return new Set(
            tasks.flatMap((task) => (task.assignees ?? []).map((member) => member.id))
        );
    }, [tasks]);
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 8 },
        })
    );
    const labelOptions = useMemo(() => {
        const map = new Map<string, { name: string; color: string }>();

        tasks.flatMap((task) => task.labels ?? []).forEach((label) => {
            const key = label.name.trim().toLowerCase();

            if (!map.has(key)) {
                map.set(key, {
                    name: label.name,
                    color: label.color,
                });
            }
        });

        return Array.from(map.values());
    }, [tasks]);

    useEffect(() => {
        let cancelled = false;
        async function init() {
            try {
                setLoading(true);
                setError(null);
                //await supabase.auth.signOut();
                const { data: authData, error: authError } = await supabase.auth.getSession();
                if (authError) throw authError;

                let session = authData.session;

                if (!session) {
                    const { data, error: signInError } = await supabase.auth.signInAnonymously();
                    if (signInError) throw signInError;
                    session = data.session;
                }

                if (cancelled) return;
                console.log('session', session);
                const uid = session?.user.id ?? null;
                setUserId(uid);
                console.log('uid', uid);
                console.log('userId1', userId);
                if (!uid) throw new Error('No user id after auth');

                await Promise.all([loadTeamMembers(uid), loadTasks(uid)]);
            } catch (err) {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : 'Failed to initialize app');
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
                else {
                    setInitOnce(false);
                }
            }
        }
        //if (initOnce) {
        init();
        //}


        return () => {
            cancelled = true;
            setInitOnce(true);
        };
    }, []);
    async function loadTasks(uid = null) {
        try {
            setError(null);
            console.log('loading tasks...');
            console.log('userId', userId);
            console.log('uid', uid);
            const [tasksRes, membersRes, assigneesRes, taskLabelsRes] = await Promise.all([
                supabase
                    .from('tasks')
                    .select('*')
                    .eq('user_id', uid ?? userId)
                    .order('created_at', { ascending: false }),

                supabase
                    .from('team_members')
                    .select('id, name, color, user_id')
                    .eq('user_id', uid ?? userId)
                    .order('created_at', { ascending: true }),

                supabase
                    .from('task_assignees')
                    .select('task_id, team_member_id')
                    .eq('user_id', uid ?? userId),

                supabase
                    .from('task_labels')
                    .select('id, task_id, user_id, name, color, created_at')
                    .eq('user_id', uid ?? userId)
                    .order('created_at', { ascending: true }),
            ]);

            if (tasksRes.error) throw tasksRes.error;
            if (membersRes.error) throw membersRes.error;
            if (assigneesRes.error) throw assigneesRes.error;
            if (taskLabelsRes.error) throw taskLabelsRes.error;
            const memberRows = (membersRes.data ?? []) as TeamMember[];
            const membersById = new Map(memberRows.map((m) => [m.id, m]));

            if (taskLabelsRes.error) throw taskLabelsRes.error;

            const taskLabelRows = (taskLabelsRes.data ?? []) as TaskLabel[];

            const labelsByTask = new Map<string, TaskLabel[]>();
            taskLabelRows.forEach((row) => {
                const list = labelsByTask.get(row.task_id) ?? [];
                list.push(row);
                labelsByTask.set(row.task_id, list);
            });

            const assigneesByTask = new Map<string, TeamMember[]>();
            (assigneesRes.data ?? []).forEach((row: TaskAssigneeRow) => {
                const member = membersById.get(row.team_member_id);
                if (!member) return;

                const list = assigneesByTask.get(row.task_id) ?? [];
                list.push(member);
                assigneesByTask.set(row.task_id, list);
            });
            const mergedTasks = (tasksRes.data ?? []).map((task: Task) => ({
                ...task,
                assignees: assigneesByTask.get(task.id) ?? [],
                labels: labelsByTask.get(task.id) ?? [],
            }));

            setTeamMembers(memberRows);
            setTasks(mergedTasks as Task[]);
            console.log('mergedTasks:', mergedTasks);

            return mergedTasks as Task[];
        } catch (err) {
            console.error('loadTasks error:', err);
            setError(err instanceof Error ? err.message : 'Failed to load tasks');
        }
    }
    async function loadTeamMembers(uid = null) {
        try {
            const { data, error } = await supabase
                .from('team_members')
                .select('id, name, color')
                .eq('user_id', uid ?? userId)
                .order('created_at', { ascending: true });

            if (error) throw error;

            setTeamMembers((data ?? []) as TeamMember[]);
        } catch (err) {
            console.error('loadTeamMembers error:', err);
            setError(err instanceof Error ? err.message : 'Failed to load team members');
        }
    }
    const filteredTasks = useMemo(() => {
        const q = search.trim().toLowerCase();

        return tasks.filter((task) => {
            const matchesSearch =
                !q ||
                [task.title, task.description ?? ''].some((value) =>
                    value.toLowerCase().includes(q)
                );

            const matchesPriority =
                priorityFilter === 'all' || task.priority === priorityFilter;

            const matchesAssignee =
                assigneeFilter === 'all' ||
                (task.assignees ?? []).some((m) => m.id === assigneeFilter);

            const matchesLabel =
                labelFilter === 'all' ||
                (task.labels ?? []).some(
                    (l) => l.name.trim().toLowerCase() === labelFilter
                );

            return matchesSearch && matchesPriority && matchesAssignee && matchesLabel;
        });
    }, [search, tasks, priorityFilter, assigneeFilter, labelFilter]);

    const grouped = useMemo(() => {
        return STATUS_COLUMNS.reduce<Record<TaskStatus, Task[]>>((acc, col) => {
            acc[col.id] = filteredTasks.filter((task) => task.status === col.id);
            return acc;
        }, {
            todo: [],
            in_progress: [],
            in_review: [],
            done: [],
        });
    }, [filteredTasks]);

    const stats = useMemo(() => {
        const total = tasks.length;
        const done = tasks.filter((t) => t.status === 'done').length;
        console.log('New date ', new Date());
        const todayDate = new Date();
        todayDate.setHours(0, 0, 0, 0);
        const overdue = tasks.filter((t) => t.due_date && t.status !== 'done' && Helper.parseDate(t.due_date) < todayDate).length;
        return { total, done, overdue };
    }, [tasks]);

    function openNewTask() {
        setSelectedTask(null);
        setModalOpen(true);
    }

    function openEditTask(task: Task) {
        setSelectedTask(task);
        setModalOpen(true);
        setComments([]);
        setCommentText('');
        loadComments(task.id);
    }
    function openMembers() {
        setTeamModalOpen(true);
    }
    async function logActivity(taskId: string, message: string) {
        await supabase.from('task_activity_log').insert({
            task_id: taskId,
            user_id: userId,
            action: message,
        });
    }
    async function loadActivity(taskId: string) {
        const { data, error } = await supabase
            .from('task_activity_log')
            .select('*')
            .eq('task_id', taskId)
            .order('created_at', { ascending: false });

        if (!error) setActivity(data ?? []);
    }
    

    async function handleSave(form: FormState, taskId?: string) {
        if (!userId) throw new Error('No active user session.');

        try {
            const oldTask = taskId ? tasks.find((t) => t.id === taskId) : null;

            const payload = {
                title: form.title,
                description: form.description || null,
                status: form.status,
                priority: form.priority,
                due_date: form.due_date || null,
                user_id: userId,
            };

            let savedTaskId = taskId ?? null;
            const isNewTask = !taskId;

            if (taskId) {
                const { error: updateError } = await supabase
                    .from('tasks')
                    .update(payload)
                    .eq('id', taskId);

                if (updateError) throw updateError;
            } else {
                const { data, error: insertError } = await supabase
                    .from('tasks')
                    .insert(payload)
                    .select('id')
                    .single();

                if (insertError) throw insertError;
                savedTaskId = data.id;
            }

            if (!savedTaskId) throw new Error('Task id missing after save');

            await supabase
                .from('task_assignees')
                .delete()
                .eq('task_id', savedTaskId);

            const assigneeIds = Array.from(new Set(form.assignee_ids ?? []));

            if (assigneeIds.length) {
                const assigneeRows = assigneeIds.map((memberId) => ({
                    task_id: savedTaskId,
                    team_member_id: memberId,
                    user_id: userId,
                }));

                const { error: assigneeInsertError } = await supabase
                    .from('task_assignees')
                    .insert(assigneeRows);

                if (assigneeInsertError) throw assigneeInsertError;
            }
            await supabase
                .from('task_labels')
                .delete()
                .eq('task_id', savedTaskId);

            const labelNames = Array.from(
                new Set(
                    (form.label_names ?? [])
                        .map((name) => name.trim())
                        .filter(Boolean)
                )
            );

            if (labelNames.length) {
                const labelRows = labelNames.map((name) => ({
                    task_id: savedTaskId,
                    user_id: userId,
                    name,
                    color: '#6366f1',
                }));

                const { error: labelInsertError } = await supabase
                    .from('task_labels')
                    .insert(labelRows);

                if (labelInsertError) throw labelInsertError;
            }
            const activityRows: { task_id: string; user_id: string; action: string }[] = [];

            if (isNewTask) {
                activityRows.push({
                    task_id: savedTaskId,
                    user_id: userId,
                    action: 'Created task',
                });
            } else if (oldTask) {
                const statusLabels: Record<TaskStatus, string> = {
                    todo: 'To Do',
                    in_progress: 'In Progress',
                    in_review: 'In Review',
                    done: 'Done',
                };

                if (oldTask.status !== form.status) {
                    activityRows.push({
                        task_id: savedTaskId,
                        user_id: userId,
                        action: `Moved from ${statusLabels[oldTask.status]} → ${statusLabels[form.status]}`,
                    });
                }

                if (oldTask.title !== form.title) {
                    activityRows.push({
                        task_id: savedTaskId,
                        user_id: userId,
                        action: `Updated title from ${oldTask.title} → ${form.title}`,
                    });
                }

                if ((oldTask.description ?? '') !== (form.description ?? '')) {
                    activityRows.push({
                        task_id: savedTaskId,
                        user_id: userId,
                        action: `Updated description from ${oldTask.description} → ${form.description}`,
                    });
                }

                if (oldTask.priority !== form.priority) {
                    activityRows.push({
                        task_id: savedTaskId,
                        user_id: userId,
                        action: `Changed priority from ${oldTask.priority} → ${form.priority}`,
                    });
                }

                if ((oldTask.due_date ?? '') !== (form.due_date ?? '')) {
                    activityRows.push({
                        task_id: savedTaskId,
                        user_id: userId,
                        action: form.due_date
                            ? `Set due date from ${Helper.formatDueDate(oldTask.due_date)} → ${Helper.formatDueDate(form.due_date)}`
                            : `Removed due date (old due date: ${Helper.formatDueDate(oldTask.due_date)})`,
                    });
                }

                const oldAssignees = (oldTask.assignees ?? []).map((m) => m.id).sort().join(',');
                const newAssignees = [...assigneeIds].sort().join(',');

                if (oldAssignees !== newAssignees) {
                    activityRows.push({
                        task_id: savedTaskId,
                        user_id: userId,
                        action: `Updated assigned team members`,
                    });
                }
                const oldLabels = (oldTask.labels ?? [])
                    .map((l) => l.name.trim().toLowerCase())
                    .sort()
                    .join(',');

                const newLabels = labelNames
                    .map((name) => name.trim().toLowerCase())
                    .sort()
                    .join(',');
                console.log('oldLabels', oldLabels);
                console.log('newLabels', newLabels);
                if (oldLabels !== newLabels) {
                    activityRows.push({
                        task_id: savedTaskId,
                        user_id: userId,
                        action: 'Updated labels',
                    });
                }
            }

            if (activityRows.length) {
                const { error: activityError } = await supabase
                    .from('task_activity_log')
                    .insert(activityRows);

                if (activityError) throw activityError;
            }
            const freshTasks = await loadTasks(userId);
            const freshTask = freshTasks.find((t) => t.id === savedTaskId) ?? null;

            if (freshTask) {
                setSelectedTask(freshTask);
            }

            if (savedTaskId) {
                await loadActivity(savedTaskId);
                await loadComments(savedTaskId);
            }
            
            if (taskId) {
                await loadActivity(taskId);
                await loadComments(taskId);
            }
        } catch (err) {
            console.error('handleSave failed:', err);
            setError(err instanceof Error ? err.message : 'Failed to save task');
            throw err;
        }
    }
    async function handleDelete(taskId: string) {
        const { error } = await supabase.from('tasks').delete().eq('id', taskId);
        if (error) throw new Error(error.message);
        await loadTasks();
    }
    async function handleSaveTeamMembers(rows: EditableMember[]) {
        if (!userId) throw new Error('No active user session.');

        const toInsert = rows
            .filter((r) => r.isNew || !r.id)
            .filter((r) => r.name.trim())
            .map((r) => ({
                name: r.name.trim(),
                color: r.color,
                user_id: userId,
            }));

        const toUpdate = rows
            .filter((r) => r.id && !r.isNew)
            .filter((r) => r.name.trim())
            .map((r) => ({
                id: r.id!,
                name: r.name.trim(),
                color: r.color,
            }));

        if (toInsert.length) {
            const { error } = await supabase.from('team_members').insert(toInsert);
            if (error) throw error;
        }

        for (const row of toUpdate) {
            const { error } = await supabase
                .from('team_members')
                .update({ name: row.name, color: row.color })
                .eq('id', row.id);

            if (error) throw error;
        }

        await loadTeamMembers();
        await loadTasks();
    }
    async function handleDeleteTeamMembers(ids: string[]) {
        const { error } = await supabase
            .from('team_members')
            .delete()
            .in('id', ids);

        if (error) throw error;

        await loadTeamMembers();
    }
    function handleDragStart(event: DragStartEvent) {
        const task = tasks.find((t) => t.id === event.active.id);
        setActiveTask(task ?? null);
    }
    async function handleDragEnd(event: DragEndEvent) {
        setActiveTask(null);

        const { active, over } = event;
        if (!over) return;

        const activeTask = tasks.find((t) => t.id === active.id);
        if (!activeTask) return;

        const targetStatus = over.id as TaskStatus;
        if (!STATUS_COLUMNS.some((c) => c.id === targetStatus)) return;
        if (activeTask.status === targetStatus) return;

        setTasks((prev) =>
            prev.map((task) =>
                task.id === activeTask.id ? { ...task, status: targetStatus } : task
            )
        );

        const { error } = await supabase
            .from('tasks')
            .update({ status: targetStatus })
            .eq('id', activeTask.id);

        if (error) {
            await loadTasks();
            setError(error.message);
        }
    }

    async function handleAddComment(taskId: string) {
        if (!userId) throw new Error('No active user session.');
        const content = commentText.trim();
        if (!content) return;

        setCommentSaving(true);
        try {
            const { error } = await supabase.from('task_comments').insert({
                task_id: taskId,
                user_id: userId,
                content,
            });

            if (error) throw error;

            setCommentText('');
            await loadComments(taskId);
        } finally {
            setCommentSaving(false);
        }
    }
    async function loadComments(taskId: string) {
        setCommentLoading(true);
        try {
            const { data, error } = await supabase
                .from('task_comments')
                .select('*')
                .eq('task_id', taskId)
                .order('created_at', { ascending: true });

            if (error) throw error;
            setComments((data ?? []) as TaskComment[]);
        } catch (err) {
            console.error('loadComments error:', err);
            setError(err instanceof Error ? err.message : 'Failed to load comments');
        } finally {
            setCommentLoading(false);
        }
    }

    return (
        <div className="app-shell">
            <header className="page-header">
                <div className="topbar">
                    <div>
                        <h1>Task Board</h1>
                    </div>
                    <div className="topbar-right">
                        <div className="session-pill">
                            {userId ? `Guest session: ${userId}` : 'Signing in...'}
                        </div>
                    </div>

                </div>
                <div className="topbar">


                    <div className="topbar-center">
                        <div className="stat-gray">
                            <strong>{stats.total}</strong>
                            <span>Total</span>
                        </div>
                        <div className="stat-green">
                            <strong>{stats.done}</strong>
                            <span>Done</span>
                        </div>
                        <div className="stat-red">
                            <strong>{stats.overdue}</strong>
                            <span>Overdue</span>
                        </div>
                    </div>
                    <div className="topbar-right">

                        <button className="primary-btn" onClick={openMembers}>+ Manage Members</button>
                    </div>
                    <div className="topbar-right">
                        <button className="success-btn" onClick={openNewTask}>+ New Task</button>
                    </div>
                </div>
                <div className="toolbar filters-row">
                    <input
                        className="search"
                        placeholder="Search tasks..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <div className="select-wrap">
                        <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as any)}>
                            <option value="all">All Priorities</option>
                            <option value="low">Low</option>
                            <option value="normal">Normal</option>
                            <option value="high">High</option>
                        </select>
                    </div>
                    <div className="select-wrap">
                        <select value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)}>
                            <option value="all">All Members</option>
                            {teamMembers.map((m) => (
                                <option key={m.id} value={m.id}>
                                    {m.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="select-wrap">
                        <select
                            value={labelFilter}
                            onChange={(e) => setLabelFilter(e.target.value)}
                        >
                            <option value="all">All Labels</option>
                            {labelOptions.map((label) => (
                                <option
                                    key={label.name}
                                    value={label.name.trim().toLowerCase()}  // 👈 important
                                >
                                    {label.name.trim().toLowerCase()}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </header>
            {error ? <div className="error-banner">{error}</div> : null}

            {loading ? (
                <div className="loading-state">
                    <span className="spinner spinner-dark" />
                    <span>Loading your board...</span>
                </div>
            ) : (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDragCancel={() => setActiveTask(null)}
                >
                    <main className="board">
                        {STATUS_COLUMNS.map((column) => (
                            <Column
                                key={column.id}
                                id={column.id}
                                title={column.label}
                                tasks={grouped[column.id]}
                                onTaskClick={openEditTask}
                            />
                        ))}
                    </main>

                    <DragOverlay>
                        {activeTask ? (
                            <div className="task-card task-card-overlay">
                                <div className="task-card-top">
                                    <span
                                        className={
                                            activeTask.priority === 'high'
                                                ? 'priority high'
                                                : activeTask.priority === 'low'
                                                    ? 'priority low'
                                                    : 'priority normal'
                                        }
                                    >
                                        {activeTask.priority}
                                    </span>
                                </div>

                                <h3>{activeTask.title}</h3>
                                {activeTask.description ? (
                                    <p>{activeTask.description}</p>
                                ) : (
                                    <p className="muted">No description</p>
                                )}
                            </div>
                        ) : null}
                    </DragOverlay>
                </DndContext>
            )}

            <TaskModal
                open={modalOpen}
                task={selectedTask}
                teamMembers={teamMembers}
                comments={comments}
                commentText={commentText}
                commentLoading={commentLoading}
                commentSaving={commentSaving}
                onCommentTextChange={setCommentText}
                onAddComment={handleAddComment}
                activity={activity}
                onClose={() => setModalOpen(false)}
                onSave={handleSave}
                onDelete={handleDelete}
            />
            <MemberModal
                open={teamModalOpen}
                members={teamMembers}
                assignedMemberIds={assignedMemberIds}
                onClose={() => setTeamModalOpen(false)}
                onSave={handleSaveTeamMembers}
                onDelete={handleDeleteTeamMembers}
            />
        </div>
    );
}




//export default App
