import { Link } from 'react-router-dom'
import LoginForm from '../components/LoginForm'

export default function LoginPage() {
  return (
    <div className="auth-container">
      <h1 style={{ marginBottom: '24px' }}>Login</h1>
      <LoginForm />
      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        <Link to="/register">Create an account</Link>
        {' | '}
        <Link to="/reset-password-request">Forgot password?</Link>
      </div>
    </div>
  )
}
