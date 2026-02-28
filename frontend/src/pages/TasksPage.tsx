import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function TasksPage() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div style={{ maxWidth: '800px', margin: '50px auto', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1>My Tasks</h1>
        <button onClick={handleLogout} style={{ padding: '8px 16px' }}>
          Logout
        </button>
      </div>
      <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
        <p>Task management UI will be implemented in the next tasks.</p>
      </div>
    </div>
  )
}
