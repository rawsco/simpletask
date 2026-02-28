# Design Document: Task Manager Application

## Overview

The Task Manager Application is a serverless web application that enables authenticated users to create, manage, and organize personal task lists. The system implements a secure, multi-tenant architecture where each user has exactly one isolated task list. The application leverages AWS serverless services (Lambda, API Gateway, DynamoDB, S3/CloudFront) to provide a cost-effective, scalable solution with comprehensive security controls.

Key design principles:
- Security-first approach with defense in depth
- Serverless architecture for cost optimization and scalability
- One-to-one mapping between users and task lists
- Mobile-responsive interface with progressive enhancement
- Pay-per-use pricing model to minimize operational costs

The application consists of three primary subsystems:
1. Authentication System: Handles user registration, email verification, login, password recovery, and session management
2. Task Management System: Manages CRUD operations, reordering, and filtering of tasks
3. Security Infrastructure: Implements rate limiting, audit logging, encryption, and AWS security controls

## Architecture

### System Architecture

The application follows a serverless three-tier architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│  (React SPA served via S3/CloudFront with HTTPS)            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ HTTPS/TLS 1.2+
                     │
┌────────────────────▼────────────────────────────────────────┐
│                    API Gateway Layer                         │
│  - REST API endpoints                                        │
│  - Request validation                                        │
│  - Throttling (100 req/min per IP, 10 req/min for auth)    │
│  - CORS configuration                                        │
│  - Custom domain with SSL certificate                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ Lambda invocation
                     │
┌────────────────────▼────────────────────────────────────────┐
│                   Lambda Functions Layer                     │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Auth Handler │  │ Task Handler │  │ Admin Handler│     │
│  │              │  │              │  │              │     │
│  │ - Register   │  │ - Create     │  │ - Audit logs │     │
│  │ - Verify     │  │ - Update     │  │ - Metrics    │     │
│  │ - Login      │  │ - Delete     │  │ - Cleanup    │     │
│  │ - Reset pwd  │  │ - List       │  │              │     │
│  │ - Session    │  │ - Reorder    │  │              │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                  │                  │              │
└─────────┼──────────────────┼──────────────────┼──────────────┘
          │                  │                  │
          │                  │                  │
┌─────────▼──────────────────▼──────────────────▼──────────────┐
│                    Data & Services Layer                      │
│                                                               │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  DynamoDB   │  │   Secrets    │  │  CloudWatch  │       │
│  │             │  │   Manager    │  │              │       │
│  │ - Users     │  │              │  │ - Logs       │       │
│  │ - Tasks     │  │ - DB creds   │  │ - Metrics    │       │
│  │ - Sessions  │  │ - Enc keys   │  │ - Alarms     │       │
│  │ - AuditLog  │  │ - API keys   │  │              │       │
│  └─────────────┘  └──────────────┘  └──────────────┘       │
│                                                               │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │     SES     │  │  CloudTrail  │  │      S3      │       │
│  │             │  │              │  │              │       │
│  │ - Verify    │  │ - API audit  │  │ - Backups    │       │
│  │ - Reset     │  │ - Compliance │  │ - Audit logs │       │
│  │ - Lockout   │  │              │  │              │       │
│  └─────────────┘  └──────────────┘  └──────────────┘       │
└───────────────────────────────────────────────────────────────┘
```

### Data Flow Patterns

#### Authentication Flow
1. User submits credentials → API Gateway validates request → Lambda authenticates
2. Lambda queries DynamoDB Users table → Validates password hash
3. Lambda creates session token → Stores encrypted session in DynamoDB
4. Returns session token to client → Client includes in subsequent requests

#### Task Operation Flow
1. Client sends authenticated request → API Gateway validates session token
2. Lambda extracts user ID from session → Queries DynamoDB with user partition key
3. Lambda performs operation → Updates DynamoDB → Returns response
4. All operations scoped to authenticated user's partition

#### Security Event Flow
1. Security event occurs → Lambda writes to DynamoDB AuditLog table
2. CloudWatch monitors for patterns → Triggers alarms on suspicious activity
3. CloudTrail logs all AWS API calls → Stored in tamper-proof S3 bucket

### Technology Stack

- Frontend: React SPA with drag-and-drop library (react-beautiful-dnd or @dnd-kit)
- Backend: Node.js Lambda functions (or Python based on team preference)
- Database: DynamoDB with on-demand billing
- Authentication: Custom JWT-based sessions with bcrypt password hashing
- Email: AWS SES for verification and password reset emails
- CDN: CloudFront with S3 origin for static assets
- Monitoring: CloudWatch Logs, Metrics, and Alarms
- Security: AWS Secrets Manager, CloudTrail, IAM roles with least privilege

## Components and Interfaces

### Frontend Components

#### AuthenticationUI
Handles all authentication-related user interactions.

```typescript
interface AuthenticationUI {
  // Registration with CAPTCHA
  renderRegistrationForm(): JSX.Element
  handleRegistration(email: string, password: string, captchaToken: string): Promise<RegistrationResult>
  
  // Email verification
  renderVerificationForm(): JSX.Element
  handleVerification(code: string): Promise<VerificationResult>
  requestNewVerificationCode(): Promise<void>
  
  // Login
  renderLoginForm(): JSX.Element
  handleLogin(email: string, password: string): Promise<LoginResult>
  
  // Password recovery
  renderPasswordResetRequest(): JSX.Element
  renderPasswordResetForm(): JSX.Element
  handlePasswordResetRequest(email: string): Promise<void>
  handlePasswordReset(code: string, newPassword: string): Promise<ResetResult>
  
  // Session management
  handleLogout(): Promise<void>
  checkSessionValidity(): Promise<boolean>
}
```

#### TaskListUI
Manages task display, creation, and interaction.

```typescript
interface TaskListUI {
  // Display
  renderTaskList(tasks: Task[], showCompleted: boolean): JSX.Element
  renderEmptyState(): JSX.Element
  renderLoadingIndicator(): JSX.Element
  
  // Task operations
  handleTaskCreate(description: string): Promise<Task>
  handleTaskToggle(taskId: string): Promise<void>
  handleTaskDelete(taskId: string): Promise<void>
  
  // Reordering with drag-and-drop
  handleDragStart(taskId: string): void
  handleDragOver(position: number): void
  handleDrop(taskId: string, newPosition: number): Promise<void>
  handleAutoScroll(direction: 'up' | 'down', speed: number): void
  
  // Infinite scroll
  handleScroll(scrollPosition: number): void
  loadMoreTasks(): Promise<Task[]>
  
  // Filtering
  toggleShowCompleted(): void
  handleCompletedTaskHide(taskId: string): void // 5-second delay
}
```

### Backend API Endpoints

#### Authentication Endpoints

```
POST /auth/register
Request: { email: string, password: string, captchaToken: string }
Response: { userId: string, message: string }
Rate limit: 10 req/min per IP

POST /auth/verify
Request: { email: string, code: string }
Response: { sessionToken: string, expiresAt: number }
Rate limit: 10 req/min per IP

POST /auth/login
Request: { email: string, password: string }
Response: { sessionToken: string, expiresAt: number }
Rate limit: 10 req/min per IP

POST /auth/logout
Request: { sessionToken: string }
Response: { success: boolean }
Rate limit: 100 req/min per IP

POST /auth/password-reset-request
Request: { email: string }
Response: { message: string }
Rate limit: 10 req/min per IP

POST /auth/password-reset
Request: { email: string, code: string, newPassword: string }
Response: { success: boolean }
Rate limit: 10 req/min per IP

POST /auth/resend-verification
Request: { email: string }
Response: { message: string }
Rate limit: 10 req/min per IP
```

#### Task Management Endpoints

```
GET /tasks
Query params: { limit: number, lastKey?: string, showCompleted?: boolean }
Response: { tasks: Task[], lastKey?: string, hasMore: boolean }
Rate limit: 1000 req/hour per user

POST /tasks
Request: { description: string }
Response: { task: Task }
Rate limit: 1000 req/hour per user

PUT /tasks/:taskId
Request: { completed?: boolean, description?: string }
Response: { task: Task }
Rate limit: 1000 req/hour per user

DELETE /tasks/:taskId
Response: { success: boolean }
Rate limit: 1000 req/hour per user

PUT /tasks/reorder
Request: { taskId: string, newPosition: number }
Response: { success: boolean }
Rate limit: 1000 req/hour per user
```

### Lambda Function Handlers

#### AuthHandler
Processes all authentication-related requests.

```typescript
interface AuthHandler {
  handleRegister(event: APIGatewayEvent): Promise<APIGatewayResponse>
  handleVerify(event: APIGatewayEvent): Promise<APIGatewayResponse>
  handleLogin(event: APIGatewayEvent): Promise<APIGatewayResponse>
  handleLogout(event: APIGatewayEvent): Promise<APIGatewayResponse>
  handlePasswordResetRequest(event: APIGatewayEvent): Promise<APIGatewayResponse>
  handlePasswordReset(event: APIGatewayEvent): Promise<APIGatewayResponse>
  handleResendVerification(event: APIGatewayEvent): Promise<APIGatewayResponse>
}
```

#### TaskHandler
Processes all task management requests.

```typescript
interface TaskHandler {
  handleList(event: APIGatewayEvent): Promise<APIGatewayResponse>
  handleCreate(event: APIGatewayEvent): Promise<APIGatewayResponse>
  handleUpdate(event: APIGatewayEvent): Promise<APIGatewayResponse>
  handleDelete(event: APIGatewayEvent): Promise<APIGatewayResponse>
  handleReorder(event: APIGatewayEvent): Promise<APIGatewayResponse>
}
```

### Service Layer Components

#### AuthenticationService
Core authentication business logic.

```typescript
interface AuthenticationService {
  // Registration
  validateCaptcha(token: string): Promise<boolean>
  validateEmail(email: string): boolean
  validatePassword(password: string): PasswordValidationResult
  checkPasswordCompromised(password: string): Promise<boolean>
  hashPassword(password: string): Promise<string>
  createUser(email: string, passwordHash: string): Promise<User>
  
  // Email verification
  generateVerificationCode(): string
  sendVerificationEmail(email: string, code: string): Promise<void>
  verifyCode(email: string, code: string): Promise<boolean>
  isCodeExpired(createdAt: number, expiryHours: number): boolean
  
  // Login
  authenticateUser(email: string, password: string): Promise<AuthResult>
  createSession(userId: string): Promise<Session>
  validateSession(sessionToken: string): Promise<Session | null>
  terminateSession(sessionToken: string): Promise<void>
  
  // Account lockout
  recordFailedLogin(email: string): Promise<void>
  isAccountLocked(email: string): Promise<boolean>
  lockAccount(email: string, durationMinutes: number): Promise<void>
  unlockAccount(email: string): Promise<void>
  
  // Password reset
  generatePasswordResetCode(): string
  sendPasswordResetEmail(email: string, code: string): Promise<void>
  resetPassword(email: string, code: string, newPassword: string): Promise<boolean>
  invalidateAllSessions(userId: string): Promise<void>
}
```

#### TaskService
Core task management business logic.

```typescript
interface TaskService {
  // CRUD operations
  createTask(userId: string, description: string): Promise<Task>
  getTask(userId: string, taskId: string): Promise<Task | null>
  listTasks(userId: string, options: ListOptions): Promise<TaskPage>
  updateTask(userId: string, taskId: string, updates: TaskUpdates): Promise<Task>
  deleteTask(userId: string, taskId: string): Promise<boolean>
  
  // Reordering
  reorderTask(userId: string, taskId: string, newPosition: number): Promise<void>
  calculateNewOrder(tasks: Task[], taskId: string, newPosition: number): number
  
  // Filtering
  filterCompletedTasks(tasks: Task[]): Task[]
  
  // Validation
  validateTaskDescription(description: string): boolean
}
```

#### RateLimitService
Manages rate limiting across different scopes.

```typescript
interface RateLimitService {
  checkIPRateLimit(ipAddress: string, endpoint: string): Promise<RateLimitResult>
  checkUserRateLimit(userId: string): Promise<RateLimitResult>
  recordRequest(key: string, windowSeconds: number): Promise<void>
  getRetryAfter(key: string): Promise<number>
  resetCounter(key: string): Promise<void>
}
```

#### AuditLogService
Handles security event logging.

```typescript
interface AuditLogService {
  logLoginAttempt(email: string, ipAddress: string, success: boolean): Promise<void>
  logPasswordChange(userId: string, ipAddress: string): Promise<void>
  logPasswordResetRequest(email: string, ipAddress: string): Promise<void>
  logAccountLockout(email: string, reason: string): Promise<void>
  logSessionEvent(userId: string, event: 'created' | 'terminated'): Promise<void>
  logRateLimitEvent(ipAddress: string, requestCount: number): Promise<void>
  queryLogs(filters: AuditLogFilters): Promise<AuditLogEntry[]>
}
```

#### EncryptionService
Manages encryption operations.

```typescript
interface EncryptionService {
  encrypt(plaintext: string): Promise<string>
  decrypt(ciphertext: string): Promise<string>
  getEncryptionKey(): Promise<string>
  rotateKeys(): Promise<void>
  reEncryptData(oldKey: string, newKey: string): Promise<void>
}
```

## Data Models

### DynamoDB Table Design

The application uses a single-table design with the following structure:

#### Users Table
```
Table: Users
Partition Key: email (String)
Attributes:
  - userId: String (UUID)
  - email: String
  - passwordHash: String (encrypted)
  - verified: Boolean
  - verificationCode: String (encrypted, nullable)
  - verificationCodeExpiry: Number (timestamp, nullable)
  - passwordResetCode: String (encrypted, nullable)
  - passwordResetCodeExpiry: Number (timestamp, nullable)
  - failedLoginAttempts: Number
  - lastFailedLoginAt: Number (timestamp, nullable)
  - lockedUntil: Number (timestamp, nullable)
  - createdAt: Number (timestamp)
  - updatedAt: Number (timestamp)

GSI: UserIdIndex
  Partition Key: userId
```

#### Tasks Table
```
Table: Tasks
Partition Key: userId (String)
Sort Key: taskId (String - UUID)
Attributes:
  - userId: String (UUID)
  - taskId: String (UUID)
  - description: String
  - completed: Boolean
  - order: Number (for user-defined ordering)
  - createdAt: Number (timestamp)
  - updatedAt: Number (timestamp)

LSI: OrderIndex
  Partition Key: userId
  Sort Key: order
```

#### Sessions Table
```
Table: Sessions
Partition Key: sessionToken (String - encrypted)
Attributes:
  - sessionToken: String (encrypted)
  - userId: String (UUID)
  - createdAt: Number (timestamp)
  - lastActivityAt: Number (timestamp)
  - expiresAt: Number (timestamp)
  - ipAddress: String
  - userAgent: String

GSI: UserSessionsIndex
  Partition Key: userId
  Sort Key: createdAt

TTL: expiresAt (automatic cleanup)
```

#### AuditLog Table
```
Table: AuditLog
Partition Key: eventId (String - UUID)
Sort Key: timestamp (Number)
Attributes:
  - eventId: String (UUID)
  - timestamp: Number
  - eventType: String (enum: login_attempt, password_change, etc.)
  - userId: String (UUID, nullable)
  - email: String (nullable)
  - ipAddress: String
  - success: Boolean (nullable)
  - metadata: Map (additional event-specific data)

GSI: UserEventsIndex
  Partition Key: userId
  Sort Key: timestamp

GSI: EventTypeIndex
  Partition Key: eventType
  Sort Key: timestamp

TTL: Set to timestamp + 90 days (automatic cleanup)
```

#### RateLimits Table
```
Table: RateLimits
Partition Key: limitKey (String - format: "ip:{address}" or "user:{userId}")
Sort Key: windowStart (Number - timestamp)
Attributes:
  - limitKey: String
  - windowStart: Number (timestamp)
  - requestCount: Number
  - expiresAt: Number (timestamp)

TTL: expiresAt (automatic cleanup)
```

### TypeScript Type Definitions

```typescript
interface User {
  userId: string
  email: string
  passwordHash: string
  verified: boolean
  verificationCode?: string
  verificationCodeExpiry?: number
  passwordResetCode?: string
  passwordResetCodeExpiry?: number
  failedLoginAttempts: number
  lastFailedLoginAt?: number
  lockedUntil?: number
  createdAt: number
  updatedAt: number
}

interface Task {
  userId: string
  taskId: string
  description: string
  completed: boolean
  order: number
  createdAt: number
  updatedAt: number
}

interface Session {
  sessionToken: string
  userId: string
  createdAt: number
  lastActivityAt: number
  expiresAt: number
  ipAddress: string
  userAgent: string
}

interface AuditLogEntry {
  eventId: string
  timestamp: number
  eventType: AuditEventType
  userId?: string
  email?: string
  ipAddress: string
  success?: boolean
  metadata: Record<string, any>
}

type AuditEventType = 
  | 'login_attempt'
  | 'password_change'
  | 'password_reset_request'
  | 'account_lockout'
  | 'session_created'
  | 'session_terminated'
  | 'rate_limit_exceeded'

interface RateLimit {
  limitKey: string
  windowStart: number
  requestCount: number
  expiresAt: number
}

interface PasswordValidationResult {
  valid: boolean
  errors: string[]
}

interface RateLimitResult {
  allowed: boolean
  retryAfter?: number
}

interface ListOptions {
  limit: number
  lastKey?: string
  showCompleted: boolean
}

interface TaskPage {
  tasks: Task[]
  lastKey?: string
  hasMore: boolean
}
```

### Data Access Patterns

1. User registration: Write to Users table
2. Email verification: Query Users by email, update verified status
3. User login: Query Users by email, validate password, create Session
4. Session validation: Query Sessions by sessionToken
5. List tasks: Query Tasks by userId with pagination
6. Create task: Write to Tasks table with userId partition key
7. Update task: Update Tasks item by userId + taskId
8. Delete task: Delete Tasks item by userId + taskId
9. Reorder task: Update order attribute, may require batch update of multiple tasks
10. Audit log write: Write to AuditLog table
11. Audit log query: Query by userId or eventType using GSIs
12. Rate limit check: Query RateLimits by limitKey + current window
13. Rate limit record: Update or create RateLimits item

