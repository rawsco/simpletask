import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, checkSession } = useAuth()

  if (!isAuthenticated || !checkSession()) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
