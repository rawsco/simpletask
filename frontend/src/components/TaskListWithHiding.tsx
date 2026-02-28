import { useState, useEffect, useRef } from 'react'
import type { Task } from '../types'

interface TaskListWithHidingProps {
  tasks: Task[]
  hideCompleted: boolean
  children: (visibleTasks: Task[]) => React.ReactNode
}

export default function TaskListWithHiding({ tasks, hideCompleted, children }: TaskListWithHidingProps) {
  const [hidingTaskIds, setHidingTaskIds] = useState<Set<string>>(new Set())
  const timeoutsRef = useRef<Map<string, number>>(new Map())

  // Track newly completed tasks and schedule hiding
  useEffect(() => {
    if (!hideCompleted) {
      // Clear all hiding timeouts if toggle is off
      timeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId))
      timeoutsRef.current.clear()
      setHidingTaskIds(new Set())
      return
    }

    tasks.forEach((task) => {
      if (task.completed && !hidingTaskIds.has(task.taskId) && !timeoutsRef.current.has(task.taskId)) {
        // Schedule hiding after 5 seconds
        const timeoutId = window.setTimeout(() => {
          setHidingTaskIds((prev) => new Set(prev).add(task.taskId))
          timeoutsRef.current.delete(task.taskId)
        }, 5000)
        
        timeoutsRef.current.set(task.taskId, timeoutId)
      } else if (!task.completed && timeoutsRef.current.has(task.taskId)) {
        // Task was uncompleted, cancel hiding
        const timeoutId = timeoutsRef.current.get(task.taskId)
        if (timeoutId) {
          clearTimeout(timeoutId)
        }
        timeoutsRef.current.delete(task.taskId)
        setHidingTaskIds((prev) => {
          const newSet = new Set(prev)
          newSet.delete(task.taskId)
          return newSet
        })
      }
    })

    // Cleanup on unmount
    return () => {
      timeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId))
      timeoutsRef.current.clear()
    }
  }, [tasks, hideCompleted, hidingTaskIds])

  // Filter visible tasks
  const visibleTasks = hideCompleted
    ? tasks.filter((task) => !task.completed || !hidingTaskIds.has(task.taskId))
    : tasks

  return <>{children(visibleTasks)}</>
}
