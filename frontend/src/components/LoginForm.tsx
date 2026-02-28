import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { apiClient } from '../services/api'

interface LoginFormProps {
  onSuccess?: () => void
}

export default function LoginForm({ onSuccess }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const session = await apiClient.login({ email, password })
      // Store session token on successful login
      login(session.sessionToken, session.expiresAt)
      if (onSuccess) {
        onSuccess()
      }
      // Redirect to task list on success
      navigate('/tasks')
    } catch (err: any) {
      // Display error messages for invalid credentials or locked account
      const errorMessage = err.response?.data?.message || 'Login failed. Please try again.'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="email">Email:</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="form-group">
        <label htmlFor="password">Password:</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      {error && <div className="error-message">{error}</div>}
      <button 
        type="submit" 
        disabled={loading} 
        style={{ 
          width: '100%', 
          backgroundColor: '#007bff', 
          color: 'white' 
        }}
      >
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  )
}
