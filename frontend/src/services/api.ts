import axios, { AxiosInstance, AxiosError } from 'axios'
import type {
  RegisterRequest,
  VerifyRequest,
  LoginRequest,
  PasswordResetRequestData,
  PasswordResetData,
  Session,
  Task,
  TaskPage,
  CreateTaskRequest,
  UpdateTaskRequest,
  ReorderTaskRequest
} from '../types'

class ApiClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    // Request interceptor to add session token
    this.client.interceptors.request.use(
      (config) => {
        const sessionData = localStorage.getItem('session')
        if (sessionData) {
          try {
            const session: Session = JSON.parse(sessionData)
            // Check if session is expired
            if (session.expiresAt > Date.now()) {
              config.headers.Authorization = `Bearer ${session.sessionToken}`
            } else {
              // Remove expired session
              localStorage.removeItem('session')
            }
          } catch (error) {
            console.error('Failed to parse session data:', error)
            localStorage.removeItem('session')
          }
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Unauthorized - clear session and redirect to login
          localStorage.removeItem('session')
          window.location.href = '/login'
        }
        return Promise.reject(error)
      }
    )
  }

  // Authentication endpoints
  async register(data: RegisterRequest): Promise<{ userId: string; message: string }> {
    const response = await this.client.post('/auth/register', data)
    return response.data
  }

  async verify(data: VerifyRequest): Promise<Session> {
    const response = await this.client.post('/auth/verify', data)
    return response.data
  }

  async login(data: LoginRequest): Promise<Session> {
    const response = await this.client.post('/auth/login', data)
    return response.data
  }

  async logout(): Promise<void> {
    await this.client.post('/auth/logout')
    localStorage.removeItem('session')
  }

  async requestPasswordReset(data: PasswordResetRequestData): Promise<{ message: string }> {
    const response = await this.client.post('/auth/password-reset-request', data)
    return response.data
  }

  async resetPassword(data: PasswordResetData): Promise<{ success: boolean }> {
    const response = await this.client.post('/auth/password-reset', data)
    return response.data
  }

  async resendVerification(email: string): Promise<{ message: string }> {
    const response = await this.client.post('/auth/resend-verification', { email })
    return response.data
  }

  // Task endpoints
  async getTasks(params?: { limit?: number; lastKey?: string; showCompleted?: boolean }): Promise<TaskPage> {
    const response = await this.client.get('/tasks', { params })
    return response.data
  }

  async createTask(data: CreateTaskRequest): Promise<{ task: Task }> {
    const response = await this.client.post('/tasks', data)
    return response.data
  }

  async updateTask(taskId: string, data: UpdateTaskRequest): Promise<{ task: Task }> {
    const response = await this.client.put(`/tasks/${taskId}`, data)
    return response.data
  }

  async deleteTask(taskId: string): Promise<{ success: boolean }> {
    const response = await this.client.delete(`/tasks/${taskId}`)
    return response.data
  }

  async reorderTask(data: ReorderTaskRequest): Promise<{ success: boolean }> {
    const response = await this.client.put('/tasks/reorder', data)
    return response.data
  }
}

export const apiClient = new ApiClient()
