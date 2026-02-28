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
    cursor: 'grab',
    position: 'relative' as const,
    zIndex: isDragging ? 1000 : 'auto'
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskItem task={task} onToggle={onToggle} onDelete={onDelete} />
    </div>
  )
}
