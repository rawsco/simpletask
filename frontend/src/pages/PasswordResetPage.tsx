import { useLocation, Link } from 'react-router-dom'
import PasswordResetForm from '../components/PasswordResetForm'

export default function PasswordResetPage() {
  const location = useLocation()
  const email = location.state?.email || ''

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px' }}>
      <h1>Reset Password</h1>
      <p style={{ marginBottom: '20px' }}>
        Enter the reset code sent to {email || 'your email'} and your new password.
      </p>
      {email ? (
        <PasswordResetForm email={email} />
      ) : (
        <div style={{ color: 'red', marginBottom: '15px' }}>
          Email address not provided. Please request a password reset again.
        </div>
      )}
      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        <Link to="/login">Back to Login</Link>
      </div>
    </div>
  )
}
