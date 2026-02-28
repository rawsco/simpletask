import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { apiClient } from '../services/api'

export default function VerifyPage() {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendMessage, setResendMessage] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const email = location.state?.email || ''

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const session = await apiClient.verify({ email, code })
      login(session.sessionToken, session.expiresAt)
      navigate('/tasks')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Verification failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setResendLoading(true)
    setResendMessage('')
    setError('')

    try {
      await apiClient.resendVerification(email)
      setResendMessage('Verification code sent! Check your email.')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to resend code.')
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px' }}>
      <h1>Verify Email</h1>
      <p style={{ marginBottom: '20px' }}>
        Enter the verification code sent to {email || 'your email'}
      </p>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="code">Verification Code:</label>
          <input
            id="code"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>
        {error && <div style={{ color: 'red', marginBottom: '15px' }}>{error}</div>}
        {resendMessage && <div style={{ color: 'green', marginBottom: '15px' }}>{resendMessage}</div>}
        <button type="submit" disabled={loading} style={{ width: '100%', padding: '10px', marginBottom: '10px' }}>
          {loading ? 'Verifying...' : 'Verify'}
        </button>
        <button
          type="button"
          onClick={handleResend}
          disabled={resendLoading || !email}
          style={{ width: '100%', padding: '10px', backgroundColor: '#6c757d' }}
        >
          {resendLoading ? 'Sending...' : 'Resend Code'}
        </button>
      </form>
      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        <Link to="/login">Back to Login</Link>
      </div>
    </div>
  )
}
