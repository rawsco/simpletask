import { useState, FormEvent } from 'react'

interface TaskCreateFormProps {
  onCreate: (description: string) => Promise<void>
}

export default function TaskCreateForm({ onCreate }: TaskCreateFormProps) {
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    
    // Validate non-empty description
    const trimmedDescription = description.trim()
    if (!trimmedDescription) {
      setError('Task description cannot be empty')
      return
    }

    setError('')
    setIsSubmitting(true)

    try {
      await onCreate(trimmedDescription)
      // Clear input field after successful creation
      setDescription('')
    } catch (err) {
      setError('Failed to create task. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter a new task..."
          disabled={isSubmitting}
          style={{
            flex: 1,
            padding: '12px',
            fontSize: '16px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            outline: 'none'
          }}
        />
        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            opacity: isSubmitting ? 0.6 : 1
          }}
        >
          {isSubmitting ? 'Adding...' : 'Add Task'}
        </button>
      </div>
      {error && (
        <div style={{
          marginTop: '8px',
          padding: '8px',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          borderRadius: '4px',
          fontSize: '14px'
        }}>
          {error}
        </div>
      )}
    </form>
  )
}
