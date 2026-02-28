import { useState, useEffect, useRef } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import DraggableTaskItem from './DraggableTaskItem'
import TaskList from './TaskList'
import type { Task } from '../types'

interface DraggableTaskListProps {
  tasks: Task[]
  onReorder: (taskId: string, newPosition: number) => Promise<void>
  onToggle: (taskId: string) => Promise<void>
  onDelete: (taskId: string) => Promise<void>
  onLoadMore: () => void
  hasMore: boolean
  isLoading: boolean
}

export default function DraggableTaskList({
  tasks,
  onReorder,
  onToggle,
  onDelete,
  onLoadMore,
  hasMore,
  isLoading
}: DraggableTaskListProps) {
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks)
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const autoScrollIntervalRef = useRef<number | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  )

  // Update local tasks when props change
  useEffect(() => {
    setLocalTasks(tasks)
  }, [tasks])

  // Auto-scroll logic
  const handleAutoScroll = (clientY: number) => {
    if (!containerRef.current) return

    const viewportHeight = window.innerHeight
    const scrollThreshold = 100 // Distance from edge to trigger scroll
    const maxScrollSpeed = 10

    let scrollSpeed = 0

    // Check if near top edge
    if (clientY < scrollThreshold) {
      const distance = scrollThreshold - clientY
      scrollSpeed = -Math.min(maxScrollSpeed, (distance / scrollThreshold) * maxScrollSpeed)
    }
    // Check if near bottom edge
    else if (clientY > viewportHeight - scrollThreshold) {
      const distance = clientY - (viewportHeight - scrollThreshold)
      scrollSpeed = Math.min(maxScrollSpeed, (distance / scrollThreshold) * maxScrollSpeed)
      
      // Load more tasks if near bottom and dragging
      const scrollPosition = window.scrollY + viewportHeight
      const documentHeight = document.documentElement.scrollHeight
      if (scrollPosition > documentHeight - 300 && hasMore && !isLoading) {
        onLoadMore()
      }
    }

    if (scrollSpeed !== 0) {
      window.scrollBy(0, scrollSpeed)
    }
  }

  const handleDragStart = (event: DragStartEvent) => {
    setIsDragging(true)
  }

  const handleDragOver = (event: DragOverEvent) => {
    if (event.activatorEvent && 'clientY' in event.activatorEvent) {
      handleAutoScroll(event.activatorEvent.clientY as number)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    setIsDragging(false)
    
    if (autoScrollIntervalRef.current) {
      clearInterval(autoScrollIntervalRef.current)
      autoScrollIntervalRef.current = null
    }

    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = localTasks.findIndex((task) => task.taskId === active.id)
      const newIndex = localTasks.findIndex((task) => task.taskId === over.id)

      if (oldIndex !== -1 && newIndex !== -1) {
        // Optimistically update UI
        const reorderedTasks = arrayMove(localTasks, oldIndex, newIndex)
        setLocalTasks(reorderedTasks)

        try {
          // Call API to persist the change
          await onReorder(active.id as string, newIndex)
        } catch (error) {
          // Revert on error
          setLocalTasks(tasks)
          console.error('Failed to reorder task:', error)
        }
      }
    }
  }

  // Start auto-scroll interval during drag
  useEffect(() => {
    if (isDragging) {
      autoScrollIntervalRef.current = window.setInterval(() => {
        // Auto-scroll will be handled in handleDragOver
      }, 16) // ~60fps

      return () => {
        if (autoScrollIntervalRef.current) {
          clearInterval(autoScrollIntervalRef.current)
        }
      }
    }
  }, [isDragging])

  return (
    <div ref={containerRef}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={localTasks.map((task) => task.taskId)}
          strategy={verticalListSortingStrategy}
        >
          <TaskList
            tasks={localTasks}
            onLoadMore={onLoadMore}
            hasMore={hasMore}
            isLoading={isLoading}
          >
            {localTasks.map((task) => (
              <DraggableTaskItem
                key={task.taskId}
                task={task}
                onToggle={onToggle}
                onDelete={onDelete}
              />
            ))}
          </TaskList>
        </SortableContext>
      </DndContext>
    </div>
  )
}
