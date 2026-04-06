#Kanban Style Task Board

A modern task management board built with React, TypeScript, Vite, and Supabase.  
It supports creating and editing tasks, drag-and-drop status updates, comments, members, and a clean Kanban-style workflow.

Frontend: https://task-board-seven-eta.vercel.app/

Repository: https://github.com/rose08mnzs/Task-Board

-Features
  - Kanban board with multiple task columns
  - Create, edit, and delete tasks
  - Drag and drop tasks between columns
  - Task details modal
  - Task Activity Log
  - Comments on tasks
  - Team member assignment
  - Priority labels and due dates
  - Loading states for async actions
  - Delete confirmation for safer task removal
  - Search and Filtering
  - Board Stats

-Tech Stack
  - Frontend: React, TypeScript, Vite
  - Styling: CSS
  - Drag and Drop: `@dnd-kit`
  - Backend / Database: Supabase
  - State/Data: React hooks and Supabase queries

-To Run 
npm install
npm install -D @types/react @types/react-dom @types/node
npm install @supabase/supabase-js @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
npm run dev

-Environment Variables 
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key


