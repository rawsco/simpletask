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
  const mouseYRef = useRef<number>(0)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts (helps with touch scrolling)
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  )

  // Update local tasks when props change
  useEffect(() => {
    setLocalTasks(tasks)
  }, [tasks])

  // Track mouse/touch position during drag
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        mouseYRef.current = e.clientY
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging && e.touches.length > 0) {
        mouseYRef.current = e.touches[0].clientY
      }
    }

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('touchmove', handleTouchMove, { passive: true })
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('touchmove', handleTouchMove)
      }
    }
  }, [isDragging])

  // Auto-scroll logic
  const performAutoScroll = () => {
    if (!isDragging) return

    const clientY = mouseYRef.current
    const viewportHeight = window.innerHeight
    const scrollThreshold = 100
    const maxScrollSpeed = 10

    let scrollSpeed = 0

    if (clientY < scrollThreshold) {
      const distance = scrollThreshold - clientY
      scrollSpeed = -Math.min(maxScrollSpeed, (distance / scrollThreshold) * maxScrollSpeed)
    } else if (clientY > viewportHeight - scrollThreshold) {
      const distance = clientY - (viewportHeight - scrollThreshold)
      scrollSpeed = Math.min(maxScrollSpeed, (distance / scrollThreshold) * maxScrollSpeed)
      
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

  const handleDragStart = (_event: DragStartEvent) => {
    setIsDragging(true)
  }

  const handleDragOver = (_event: DragOverEvent) => {
    // Auto-scroll is handled in the interval
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
        performAutoScroll()
      }, 16) // ~60fps

      return () => {
        if (autoScrollIntervalRef.current) {
          clearInterval(autoScrollIntervalRef.current)
        }
      }
    }
  }, [isDragging, hasMore, isLoading])

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
          items={localTasks.map((task: Task) => task.taskId)}
          strategy={verticalListSortingStrategy}
        >
          <TaskList
            tasks={localTasks}
            onLoadMore={onLoadMore}
            hasMore={hasMore}
            isLoading={isLoading}
          >
            {localTasks.map((task: Task) => (
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
