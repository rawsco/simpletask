import { Link } from 'react-router-dom'
import PasswordResetRequest from '../components/PasswordResetRequest'

export default function PasswordResetRequestPage() {
  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px' }}>
      <h1>Reset Password</h1>
      <p style={{ marginBottom: '20px' }}>
        Enter your email address and we'll send you a password reset code.
      </p>
      <PasswordResetRequest />
      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        <Link to="/login">Back to Login</Link>
      </div>
    </div>
  )
}
