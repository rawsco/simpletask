import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../services/api'
import TaskCreateForm from '../components/TaskCreateForm'
import DraggableTaskList from '../components/DraggableTaskList'
import HideCompletedToggle, { useHideCompletedPreference } from '../components/HideCompletedToggle'
import TaskListWithHiding from '../components/TaskListWithHiding'
import { ThemeToggle } from '../components/ThemeToggle'
import type { Task } from '../types'

export default function TasksPage() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [tasks, setTasks] = useState<Task[]>([])
  const [lastKey, setLastKey] = useState<string | undefined>()
  const [hasMore, setHasMore] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [hideCompleted, setHideCompleted] = useHideCompletedPreference()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  // Load initial tasks
  useEffect(() => {
    loadTasks(true)
  }, [])

  const loadTasks = async (initial = false) => {
    if (isLoading) return

    setIsLoading(true)
    try {
      const response = await apiClient.getTasks({
        limit: 50,
        lastKey: initial ? undefined : lastKey,
        showCompleted: !hideCompleted
      })

      if (initial) {
        setTasks(response.tasks)
      } else {
        setTasks((prev) => [...prev, ...response.tasks])
      }

      setLastKey(response.lastKey)
      setHasMore(response.hasMore)
    } catch (error) {
      console.error('Failed to load tasks:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLoadMore = useCallback(() => {
    if (hasMore && !isLoading) {
      loadTasks(false)
    }
  }, [hasMore, isLoading, lastKey])

  const handleCreateTask = async (description: string) => {
    const response = await apiClient.createTask({ description })
    // Add new task to the beginning of the list
    setTasks((prev) => [response.task, ...prev])
  }

  const handleToggleTask = async (taskId: string) => {
    const task = tasks.find((t) => t.taskId === taskId)
    if (!task) return

    // Optimistically update UI
    setTasks((prev) =>
      prev.map((t) => (t.taskId === taskId ? { ...t, completed: !t.completed } : t))
    )

    try {
      await apiClient.updateTask(taskId, { completed: !task.completed })
    } catch (error) {
      // Revert on error
      setTasks((prev) =>
        prev.map((t) => (t.taskId === taskId ? { ...t, completed: task.completed } : t))
      )
      console.error('Failed to toggle task:', error)
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    // Optimistically remove from UI
    setTasks((prev) => prev.filter((t) => t.taskId !== taskId))

    try {
      await apiClient.deleteTask(taskId)
    } catch (error) {
      // Reload tasks on error
      loadTasks(true)
      console.error('Failed to delete task:', error)
    }
  }

  const handleReorderTask = async (taskId: string, newPosition: number) => {
    await apiClient.reorderTask({ taskId, newPosition })
  }

  const handleToggleHideCompleted = (hide: boolean) => {
    setHideCompleted(hide)
    // Reload tasks with new filter
    loadTasks(true)
  }

  return (
    <div className="tasks-container">
      <div className="page-header">
        <h1>My Tasks</h1>
        <div className="flex items-center gap-2">
          <ThemeToggle variant="dropdown" />
          <button onClick={handleLogout} style={{ backgroundColor: '#6c757d', color: 'white' }}>
            Logout
          </button>
        </div>
      </div>

      <TaskCreateForm onCreate={handleCreateTask} />
      
      <HideCompletedToggle hideCompleted={hideCompleted} onToggle={handleToggleHideCompleted} />

      <TaskListWithHiding tasks={tasks} hideCompleted={hideCompleted}>
        {(visibleTasks) => (
          <DraggableTaskList
            tasks={visibleTasks}
            onReorder={handleReorderTask}
            onToggle={handleToggleTask}
            onDelete={handleDeleteTask}
            onLoadMore={handleLoadMore}
            hasMore={hasMore}
            isLoading={isLoading}
          />
        )}
      </TaskListWithHiding>
    </div>
  )
}
