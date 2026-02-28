import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { apiClient } from '../services/api'

export default function PasswordResetPage() {
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const email = location.state?.email || ''

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await apiClient.resetPassword({ email, code, newPassword })
      navigate('/login', { state: { message: 'Password reset successful. Please login.' } })
    } catch (err: any) {
      setError(err.response?.data?.message || 'Password reset failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px' }}>
      <h1>Reset Password</h1>
      <p style={{ marginBottom: '20px' }}>
        Enter the reset code sent to {email || 'your email'} and your new password.
      </p>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="code">Reset Code:</label>
          <input
            id="code"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="newPassword">New Password:</label>
          <input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={12}
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
          <small style={{ display: 'block', marginTop: '5px', color: '#666' }}>
            Password must be at least 12 characters with uppercase, lowercase, number, and special character
          </small>
        </div>
        {error && <div style={{ color: 'red', marginBottom: '15px' }}>{error}</div>}
        <button type="submit" disabled={loading} style={{ width: '100%', padding: '10px' }}>
          {loading ? 'Resetting...' : 'Reset Password'}
        </button>
      </form>
      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        <Link to="/login">Back to Login</Link>
      </div>
    </div>
  )
}
