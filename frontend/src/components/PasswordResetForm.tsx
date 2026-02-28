import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../services/api'

interface PasswordResetFormProps {
  email: string
  onSuccess?: () => void
}

export default function PasswordResetForm({ email, onSuccess }: PasswordResetFormProps) {
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [successMessage, setSuccessMessage] = useState('')
  const navigate = useNavigate()

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
    setSuccessMessage('')

    // Client-side password validation
    const passwordErrors = validatePassword(newPassword)
    if (passwordErrors.length > 0) {
      setValidationErrors(passwordErrors)
      return
    }

    setLoading(true)

    try {
      await apiClient.resetPassword({ email, code, newPassword })
      // Display success message
      setSuccessMessage('Password reset successful! Redirecting to login...')
      if (onSuccess) {
        onSuccess()
      }
      // Redirect to login after a short delay
      setTimeout(() => {
        navigate('/login')
      }, 2000)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Password reset failed. Please check your code and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="code">Reset Code:</label>
        <input
          id="code"
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
          placeholder="Enter the code from your email"
        />
      </div>
      <div className="form-group">
        <label htmlFor="newPassword">New Password:</label>
        <input
          id="newPassword"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
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
      {error && <div className="error-message">{error}</div>}
      {successMessage && <div className="success-message">{successMessage}</div>}
      <button 
        type="submit" 
        disabled={loading} 
        style={{ 
          width: '100%',
          backgroundColor: '#007bff',
          color: 'white'
        }}
      >
        {loading ? 'Resetting...' : 'Reset Password'}
      </button>
    </form>
  )
}
