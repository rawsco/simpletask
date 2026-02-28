import { useLocation, Link } from 'react-router-dom'
import EmailVerificationForm from '../components/EmailVerificationForm'

export default function VerifyPage() {
  const location = useLocation()
  const email = location.state?.email || ''

  return (
    <div className="auth-container">
      <h1 style={{ marginBottom: '24px' }}>Verify Email</h1>
      <p style={{ marginBottom: '20px' }}>
        Enter the verification code sent to {email || 'your email'}
      </p>
      {email ? (
        <EmailVerificationForm email={email} />
      ) : (
        <div className="error-message">
          Email address not provided. Please register again.
        </div>
      )}
      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        <Link to="/login">Back to Login</Link>
      </div>
    </div>
  )
}
