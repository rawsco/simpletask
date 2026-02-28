import { Link } from 'react-router-dom'
import RegistrationForm from '../components/RegistrationForm'

export default function RegisterPage() {
  return (
    <div className="auth-container">
      <h1 style={{ marginBottom: '24px' }}>Register</h1>
      <RegistrationForm />
      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        <Link to="/login">Already have an account? Login</Link>
      </div>
    </div>
  )
}
