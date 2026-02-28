import { useState } from 'react'
import type { Task } from '../types'

interface TaskItemProps {
  task: Task
  onToggle: (taskId: string) => Promise<void>
  onDelete: (taskId: string) => Promise<void>
}

export default function TaskItem({ task, onToggle, onDelete }: TaskItemProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleToggle = async () => {
    await onToggle(task.taskId)
  }

  const handleDeleteClick = () => {
    setShowConfirm(true)
  }

  const handleConfirmDelete = async () => {
    setIsDeleting(true)
    try {
      await onDelete(task.taskId)
    } catch (error) {
      setIsDeleting(false)
      setShowConfirm(false)
    }
  }

  const handleCancelDelete = () => {
    setShowConfirm(false)
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      padding: '12px',
      border: '1px solid #e0e0e0',
      borderRadius: '4px',
      marginBottom: '8px',
      backgroundColor: task.completed ? '#f5f5f5' : '#fff',
      opacity: isDeleting ? 0.5 : 1,
      transition: 'background-color 0.2s, opacity 0.2s'
    }}>
      <input
        type="checkbox"
        checked={task.completed}
        onChange={handleToggle}
        disabled={isDeleting}
        style={{
          width: '20px',
          height: '20px',
          marginRight: '12px',
          cursor: isDeleting ? 'not-allowed' : 'pointer'
        }}
      />
      <span style={{
        flex: 1,
        textDecoration: task.completed ? 'line-through' : 'none',
        color: task.completed ? '#999' : '#333',
        fontSize: '16px'
      }}>
        {task.description}
      </span>
      {!showConfirm ? (
        <button
          onClick={handleDeleteClick}
          disabled={isDeleting}
          style={{
            padding: '6px 12px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isDeleting ? 'not-allowed' : 'pointer',
            fontSize: '14px'
          }}
        >
          Delete
        </button>
      ) : (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleConfirmDelete}
            disabled={isDeleting}
            style={{
              padding: '6px 12px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isDeleting ? 'not-allowed' : 'pointer',
              fontSize: '14px'
            }}
          >
            Confirm
          </button>
          <button
            onClick={handleCancelDelete}
            disabled={isDeleting}
            style={{
              padding: '6px 12px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isDeleting ? 'not-allowed' : 'pointer',
              fontSize: '14px'
            }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}
