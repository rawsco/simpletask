import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../services/api'

interface PasswordResetRequestProps {
  onSuccess?: () => void
}

export default function PasswordResetRequest({ onSuccess }: PasswordResetRequestProps) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')
    setLoading(true)

    try {
      const response = await apiClient.requestPasswordReset({ email })
      // Display success message
      setSuccessMessage(response.message || 'Password reset code sent! Please check your email.')
      if (onSuccess) {
        onSuccess()
      }
      // Redirect to password reset form after a short delay
      setTimeout(() => {
        navigate('/reset-password', { state: { email } })
      }, 2000)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send reset code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: '15px' }}>
        <label htmlFor="email">Email:</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="Enter your email address"
          style={{ width: '100%', padding: '8px', marginTop: '5px' }}
        />
      </div>
      {error && <div style={{ color: 'red', marginBottom: '15px' }}>{error}</div>}
      {successMessage && <div style={{ color: 'green', marginBottom: '15px' }}>{successMessage}</div>}
      <button type="submit" disabled={loading} style={{ width: '100%', padding: '10px' }}>
        {loading ? 'Sending...' : 'Send Reset Code'}
      </button>
    </form>
  )
}
