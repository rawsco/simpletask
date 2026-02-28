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
    <form onSubmit={handleSubmit} className="task-create-form">
      <input
        type="text"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Enter a new task..."
        disabled={isSubmitting}
      />
      <button
        type="submit"
        disabled={isSubmitting}
        style={{
          backgroundColor: '#007bff',
          color: 'white'
        }}
      >
        {isSubmitting ? 'Adding...' : 'Add Task'}
      </button>
      {error && (
        <div className="error-message" style={{ width: '100%' }}>
          {error}
        </div>
      )}
    </form>
  )
}
