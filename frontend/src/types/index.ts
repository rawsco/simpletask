export interface User {
  userId: string
  email: string
}

export interface Task {
  userId: string
  taskId: string
  description: string
  completed: boolean
  order: number
  createdAt: number
  updatedAt: number
}

export interface Session {
  sessionToken: string
  expiresAt: number
}

export interface RegisterRequest {
  email: string
  password: string
  captchaToken: string
}

export interface VerifyRequest {
  email: string
  code: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface PasswordResetRequestData {
  email: string
}

export interface PasswordResetData {
  email: string
  code: string
  newPassword: string
}

export interface TaskPage {
  tasks: Task[]
  lastKey?: string
  hasMore: boolean
}

export interface CreateTaskRequest {
  description: string
}

export interface UpdateTaskRequest {
  completed?: boolean
  description?: string
}

export interface ReorderTaskRequest {
  taskId: string
  newPosition: number
}
