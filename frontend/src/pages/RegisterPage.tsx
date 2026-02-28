import { Link } from 'react-router-dom'
import RegistrationForm from '../components/RegistrationForm'

export default function RegisterPage() {
  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px' }}>
      <h1>Register</h1>
      <RegistrationForm />
      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        <Link to="/login">Already have an account? Login</Link>
      </div>
    </div>
  )
}
