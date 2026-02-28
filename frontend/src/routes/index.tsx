import { Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from '../components/ProtectedRoute'
import LoginPage from '../pages/LoginPage'
import RegisterPage from '../pages/RegisterPage'
import VerifyPage from '../pages/VerifyPage'
import PasswordResetRequestPage from '../pages/PasswordResetRequestPage'
import PasswordResetPage from '../pages/PasswordResetPage'
import TasksPage from '../pages/TasksPage'

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify" element={<VerifyPage />} />
      <Route path="/reset-password-request" element={<PasswordResetRequestPage />} />
      <Route path="/reset-password" element={<PasswordResetPage />} />
      <Route
        path="/tasks"
        element={
          <ProtectedRoute>
            <TasksPage />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/tasks" replace />} />
    </Routes>
  )
}
