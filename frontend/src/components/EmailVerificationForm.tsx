import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { apiClient } from '../services/api'

interface EmailVerificationFormProps {
  email: string
  onSuccess?: () => void
}

export default function EmailVerificationForm({ email, onSuccess }: EmailVerificationFormProps) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendMessage, setResendMessage] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const session = await apiClient.verify({ email, code })
      // Store session token on successful verification
      login(session.sessionToken, session.expiresAt)
      if (onSuccess) {
        onSuccess()
      }
      // Redirect to task list on success
      navigate('/tasks')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Verification failed. Please check your code and try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResendCode = async () => {
    setError('')
    setResendMessage('')
    setResendLoading(true)

    try {
      const response = await apiClient.resendVerification(email)
      setResendMessage(response.message || 'Verification code sent! Please check your email.')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to resend code. Please try again.')
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="code">Verification Code:</label>
          <input
            id="code"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            placeholder="Enter the code from your email"
          />
        </div>
        {error && <div className="error-message">{error}</div>}
        {resendMessage && <div className="success-message">{resendMessage}</div>}
        <button 
          type="submit" 
          disabled={loading} 
          style={{ 
            width: '100%', 
            marginBottom: '10px',
            backgroundColor: '#007bff',
            color: 'white'
          }}
        >
          {loading ? 'Verifying...' : 'Verify Email'}
        </button>
      </form>
      <button
        type="button"
        onClick={handleResendCode}
        disabled={resendLoading}
        style={{
          width: '100%',
          backgroundColor: '#f0f0f0',
          color: '#333',
          border: '1px solid #ccc'
        }}
      >
        {resendLoading ? 'Sending...' : 'Resend Code'}
      </button>
    </div>
  )
}
