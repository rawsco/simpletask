import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import TaskItem from './TaskItem'
import type { Task } from '../types'

interface DraggableTaskItemProps {
  task: Task
  onToggle: (taskId: string) => Promise<void>
  onDelete: (taskId: string) => Promise<void>
}

export default function DraggableTaskItem({ task, onToggle, onDelete }: DraggableTaskItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: task.taskId })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative' as const,
    zIndex: isDragging ? 1000 : 'auto',
    touchAction: 'none' // Prevent default touch actions during drag
  }

  return (
    <div ref={setNodeRef} style={style}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Drag handle - touch-friendly */}
        <div
          {...attributes}
          {...listeners}
          style={{
            cursor: isDragging ? 'grabbing' : 'grab',
            padding: '8px',
            minWidth: '44px',
            minHeight: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#666',
            fontSize: '20px',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            touchAction: 'none'
          }}
          aria-label="Drag to reorder"
        >
          ⋮⋮
        </div>
        <div style={{ flex: 1 }}>
          <TaskItem task={task} onToggle={onToggle} onDelete={onDelete} />
        </div>
      </div>
    </div>
  )
}
