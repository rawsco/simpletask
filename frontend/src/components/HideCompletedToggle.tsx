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
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
      <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}>
        <input
          type="checkbox"
          checked={hideCompleted}
          onChange={handleToggle}
          style={{
            width: '18px',
            height: '18px',
            marginRight: '8px',
            cursor: 'pointer'
          }}
        />
        <span style={{ fontSize: '14px', color: '#555' }}>
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
