import { useEffect, useRef } from 'react'
import type { Task } from '../types'

interface TaskListProps {
  tasks: Task[]
  onLoadMore: () => void
  hasMore: boolean
  isLoading: boolean
  children: React.ReactNode
}

export default function TaskList({ tasks, onLoadMore, hasMore, isLoading, children }: TaskListProps) {
  const observerTarget = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry.isIntersecting && hasMore && !isLoading) {
          onLoadMore()
        }
      },
      { threshold: 0, rootMargin: '200px' }
    )

    const currentTarget = observerTarget.current
    if (currentTarget) {
      observer.observe(currentTarget)
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget)
      }
    }
  }, [hasMore, isLoading, onLoadMore])

  if (tasks.length === 0 && !isLoading) {
    return (
      <div className="empty-state">
        <p>No tasks yet. Create your first task to get started!</p>
      </div>
    )
  }

  return (
    <div>
      {children}
      {isLoading && (
        <div className="loading-indicator">
          <div className="spinner" />
          <p style={{ marginTop: '10px' }}>Loading tasks...</p>
        </div>
      )}
      {hasMore && <div ref={observerTarget} style={{ height: '1px' }} />}
    </div>
  )
}
