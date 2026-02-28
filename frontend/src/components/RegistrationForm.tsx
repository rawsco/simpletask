import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../services/api'

interface RegistrationFormProps {
  onSuccess?: () => void
}

export default function RegistrationForm({ onSuccess }: RegistrationFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [captchaToken, setCaptchaToken] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const navigate = useNavigate()

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validatePassword = (password: string): string[] => {
    const errors: string[] = []
    
    if (password.length < 12) {
      errors.push('Password must be at least 12 characters long')
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter')
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter')
    }
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one digit')
    }
    if (!/[!@#$%^&*()\-+=\[\]{}|;:,.<>?]/.test(password)) {
      errors.push('Password must contain at least one special character (!@#$%^&*()-+=[]{}|;:,.<>?)')
    }
    
    return errors
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setValidationErrors([])

    // Client-side validation
    if (!validateEmail(email)) {
      setError('Invalid email format')
      return
    }

    const passwordErrors = validatePassword(password)
    if (passwordErrors.length > 0) {
      setValidationErrors(passwordErrors)
      return
    }

    if (!captchaToken) {
      setError('Please complete the CAPTCHA')
      return
    }

    setLoading(true)

    try {
      await apiClient.register({ email, password, captchaToken })
      if (onSuccess) {
        onSuccess()
      }
      // Redirect to verification page with email in state
      navigate('/verify', { state: { email } })
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.')
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
        {validationErrors.length > 0 && (
          <div style={{ color: '#dc3545', fontSize: '14px', marginTop: '8px' }}>
            {validationErrors.map((err, idx) => (
              <div key={idx}>• {err}</div>
            ))}
          </div>
        )}
      </div>
      <div className="form-group">
        <label htmlFor="captcha">CAPTCHA Token:</label>
        <input
          id="captcha"
          type="text"
          value={captchaToken}
          onChange={(e) => setCaptchaToken(e.target.value)}
          required
          placeholder="Enter CAPTCHA response"
        />
        <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
          Note: CAPTCHA integration pending
        </div>
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
        {loading ? 'Registering...' : 'Register'}
      </button>
    </form>
  )
}
