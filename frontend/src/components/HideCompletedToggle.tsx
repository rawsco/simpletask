import { useState } from 'react'

interface HideCompletedToggleProps {
  hideCompleted: boolean
  onToggle: (hide: boolean) => void
}

export default function HideCompletedToggle({ hideCompleted, onToggle }: HideCompletedToggleProps) {
  const handleToggle = () => {
    const newValue = !hideCompleted
    onToggle(newValue)
    // Persist preference to localStorage
    localStorage.setItem('hideCompletedTasks', JSON.stringify(newValue))
  }

  return (
    <div style={{ marginBottom: '16px' }}>
      <label 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          cursor: 'pointer', 
          userSelect: 'none',
          padding: '8px',
          minHeight: '44px',
          WebkitTapHighlightColor: 'rgba(0, 0, 0, 0.05)'
        }}
      >
        <input
          type="checkbox"
          checked={hideCompleted}
          onChange={handleToggle}
          style={{
            cursor: 'pointer'
          }}
        />
        <span style={{ fontSize: '16px', color: '#555' }}>
          Hide completed tasks
        </span>
      </label>
    </div>
  )
}

// Hook to load preference from localStorage
export function useHideCompletedPreference(): [boolean, (hide: boolean) => void] {
  const [hideCompleted, setHideCompleted] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('hideCompletedTasks')
      return stored ? JSON.parse(stored) : false
    } catch {
      return false
    }
  })

  return [hideCompleted, setHideCompleted]
}
