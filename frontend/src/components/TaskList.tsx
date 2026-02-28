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
      <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
        <p>No tasks yet. Create your first task to get started!</p>
      </div>
    )
  }

  return (
    <div>
      {children}
      {isLoading && (
        <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
          <div style={{ 
            display: 'inline-block',
            width: '20px',
            height: '20px',
            border: '3px solid #f3f3f3',
            borderTop: '3px solid #3498db',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
          <p style={{ marginTop: '10px' }}>Loading tasks...</p>
        </div>
      )}
      {hasMore && <div ref={observerTarget} style={{ height: '1px' }} />}
    </div>
  )
}
