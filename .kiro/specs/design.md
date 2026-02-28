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


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: CAPTCHA Validation Before Registration

*For any* registration attempt, the system SHALL validate the CAPTCHA response before creating a user account, and invalid CAPTCHA responses SHALL result in registration rejection.

**Validates: Requirement 1.1, 1.2**

### Property 2: Email Uniqueness

*For any* registration attempt with an email that already exists in the Users table, the system SHALL reject the registration and return an error message.

**Validates: Requirement 1.4**

### Property 3: Password Hashing Before Storage

*For any* password provided during registration or password reset, the system SHALL hash the password using bcrypt before storing it in the database, and plaintext passwords SHALL never be stored.

**Validates: Requirement 1.6**

### Property 4: One Task List Per User

*For any* user account created, the system SHALL create exactly one task list, and the relationship between user and task list SHALL remain one-to-one throughout the user's lifecycle.

**Validates: Requirement 1.7, 18.1, 18.6**

### Property 5: Email Verification Requirement

*For any* newly registered user, the system SHALL prevent access to the application until email verification is complete.

**Validates: Requirement 1.9, 2.5**

### Property 6: Verification Code Expiry

*For any* verification code older than 24 hours, the system SHALL reject verification attempts and require a new code to be requested.

**Validates: Requirement 2.4**

### Property 7: Password Reset Code Expiry

*For any* password reset code older than 1 hour, the system SHALL reject password reset attempts and require a new code to be requested.

**Validates: Requirement 3.4**

### Property 8: Session Invalidation on Password Reset

*For any* successful password reset, the system SHALL invalidate all existing sessions for that user, requiring re-authentication.

**Validates: Requirement 3.5**

### Property 9: Session Authentication

*For any* authenticated request, the system SHALL validate the session token and only display data belonging to the authenticated user.

**Validates: Requirement 4.1, 4.3**

### Property 10: HTTPS Enforcement

*For any* client-server communication, the system SHALL use HTTPS with TLS 1.2 or higher, and HTTP requests SHALL be redirected to HTTPS.

**Validates: Requirement 5.1, 5.2, 5.5**

### Property 11: SSL Certificate Auto-Renewal

*For any* SSL certificate within 30 days of expiration, the system SHALL automatically renew the certificate.

**Validates: Requirement 5.4**

### Property 12: IP-Based Rate Limiting

*For any* IP address exceeding 100 requests per minute (or 10 requests per minute for auth endpoints), the system SHALL reject subsequent requests with HTTP 429 status and include a Retry-After header.

**Validates: Requirement 6.1, 6.3, 6.6**

### Property 13: User-Based Rate Limiting

*For any* authenticated user exceeding 1000 requests per hour, the system SHALL reject subsequent requests with HTTP 429 status.

**Validates: Requirement 6.2**

### Property 14: Rate Limit Logging

*For any* rate limit event, the system SHALL log the event to the AuditLog table with IP address and request count.

**Validates: Requirement 6.4**

### Property 15: Session Inactivity Timeout

*For any* session with 30 minutes of inactivity, the system SHALL automatically terminate the session and require re-authentication.

**Validates: Requirement 7.1, 7.2**

### Property 16: Session Activity Reset

*For any* user action during an active session, the system SHALL reset the inactivity timer.

**Validates: Requirement 7.3**

### Property 17: Maximum Session Lifetime

*For any* session, the system SHALL enforce a maximum lifetime of 24 hours regardless of activity, after which re-authentication is required.

**Validates: Requirement 7.5, 7.6**

### Property 18: Password Complexity Enforcement

*For any* password creation or change, the system SHALL enforce minimum length of 12 characters, at least one uppercase letter, one lowercase letter, one digit, and one special character.

**Validates: Requirement 8.1, 8.2, 8.3, 8.4, 8.5**

### Property 19: Compromised Password Rejection

*For any* password that matches a list of commonly compromised passwords, the system SHALL reject the password.

**Validates: Requirement 8.7**

### Property 20: Account Lockout After Failed Attempts

*For any* account with 5 consecutive failed login attempts within 15 minutes, the system SHALL lock the account for 15 minutes.

**Validates: Requirement 9.1, 9.2**

### Property 21: Failed Login Counter Reset

*For any* successful login, the system SHALL reset the failed login attempt counter to zero.

**Validates: Requirement 9.4**

### Property 22: Account Lockout Notification

*For any* account lockout event, the system SHALL send an email notification to the account owner and log the event to the AuditLog.

**Validates: Requirement 9.5, 9.6**

### Property 23: Security Event Logging

*For any* security event (login attempt, password change, password reset request, account lockout, session creation/termination, rate limiting), the system SHALL log the event to the AuditLog with timestamp, relevant identifiers, and IP address.

**Validates: Requirement 10.1, 10.2, 10.3, 10.4, 10.5, 10.6**

### Property 24: Audit Log Retention

*For any* audit log entry, the system SHALL retain the entry for at least 90 days and protect it from modification or deletion by application users.

**Validates: Requirement 10.7, 10.8**

### Property 25: Audit Log Event ID Uniqueness

*For any* audit log entry, the system SHALL include a unique event identifier.

**Validates: Requirement 10.9**

### Property 26: Sensitive Data Encryption at Rest

*For any* sensitive data (password hashes, session tokens, verification codes, password reset codes), the system SHALL encrypt the data using AES-256 before storing in the database.

**Validates: Requirement 11.1, 11.2, 11.3**

### Property 27: Encryption Key Separation

*For any* encrypted data, the system SHALL store encryption keys separately from the encrypted data using AWS Secrets Manager.

**Validates: Requirement 11.4**

### Property 28: Transparent Decryption

*For any* encrypted data retrieval, the system SHALL decrypt the data transparently for authorized operations.

**Validates: Requirement 11.6**

### Property 29: Security Headers Implementation

*For any* HTTP response, the system SHALL include Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, Strict-Transport-Security, Referrer-Policy, CORS, and X-XSS-Protection headers.

**Validates: Requirement 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7**

### Property 30: IAM Least Privilege

*For any* AWS resource, the system SHALL implement IAM roles and policies following the principle of least privilege.

**Validates: Requirement 13.1**

### Property 31: CloudTrail Logging

*For any* AWS API call or infrastructure change, the system SHALL log the event to CloudTrail and store in a tamper-proof S3 bucket with versioning.

**Validates: Requirement 13.2, 13.3**

### Property 32: Secrets Manager Usage

*For any* credential, API key, or encryption key, the system SHALL store and manage it using AWS Secrets Manager with automatic 90-day rotation.

**Validates: Requirement 13.4, 13.5**

### Property 33: Data Encryption in Transit

*For any* data transfer between AWS services, the system SHALL use TLS 1.2 or higher.

**Validates: Requirement 13.6**

### Property 34: Task Creation with User Association

*For any* task creation, the system SHALL associate the task with the authenticated user and persist it to the database immediately.

**Validates: Requirement 14.1, 14.2, 14.4**

### Property 35: Empty Task Rejection

*For any* task creation attempt with empty or whitespace-only text, the system SHALL reject the creation and maintain the current state.

**Validates: Requirement 14.3**

### Property 36: Task Status Toggle

*For any* task status update, the system SHALL toggle between complete and incomplete states and persist the change immediately.

**Validates: Requirement 15.1, 15.2**

### Property 37: Task Display Filtering

*For any* task list display, the system SHALL show only tasks belonging to the authenticated user.

**Validates: Requirement 16.1, 18.2**

### Property 38: Empty State Display

*For any* user with no tasks, the system SHALL display an appropriate empty state message.

**Validates: Requirement 16.4**

### Property 39: Task Deletion Authorization

*For any* task deletion, the system SHALL only allow users to delete their own tasks and remove the task permanently from the database.

**Validates: Requirement 17.1, 17.3**

### Property 40: Multi-User Data Isolation

*For any* user, the system SHALL prevent access to, modification of, or deletion of tasks belonging to other users.

**Validates: Requirement 18.3, 18.4, 18.5**

### Property 41: Task Reordering Persistence

*For any* task reorder operation, the system SHALL update the task order and persist the new order to the database immediately.

**Validates: Requirement 19.1, 19.2**

### Property 42: Task Order Display

*For any* task list access, the system SHALL display tasks in the order previously set by the user.

**Validates: Requirement 19.3**

### Property 43: Drag Operation Visual Feedback

*For any* drag operation, the system SHALL provide visual feedback indicating where the task will be placed.

**Validates: Requirement 19.4**

### Property 44: Drag Auto-Scroll

*For any* drag operation near viewport edges, the system SHALL automatically scroll at a speed proportional to the distance from the edge.

**Validates: Requirement 19.6, 19.7, 19.8**

### Property 45: Drag State Preservation During Load

*For any* drag operation that triggers additional task loading, the system SHALL maintain the drag state and allow seamless continuation.

**Validates: Requirement 19.9, 19.10**

### Property 46: Initial Batch Load

*For any* task list access, the system SHALL initially load 50 tasks.

**Validates: Requirement 20.1**

### Property 47: Infinite Scroll Trigger

*For any* scroll position within 200 pixels of the bottom, the system SHALL automatically fetch the next batch of tasks.

**Validates: Requirement 20.2**

### Property 48: Loading Indicator Display

*For any* task fetch operation, the system SHALL display a loading indicator and hide it when all tasks are loaded.

**Validates: Requirement 20.3, 20.5**

### Property 49: Scroll Position Preservation

*For any* new task batch load, the system SHALL append tasks without disrupting the user's scroll position.

**Validates: Requirement 20.4**

### Property 50: Smooth Scrolling Performance

*For any* task list containing up to 10,000 tasks, the system SHALL maintain smooth scrolling performance.

**Validates: Requirement 20.6**

### Property 51: Hide Completed Tasks Toggle

*For any* hide completed tasks toggle, the system SHALL show or hide completed tasks accordingly and persist the user's preference.

**Validates: Requirement 21.1, 21.2, 21.5**

### Property 52: Completed Task Hide Delay

*For any* task marked as complete when hide completed tasks is enabled, the system SHALL wait 5 seconds before hiding the task.

**Validates: Requirement 21.3**

### Property 53: Task Reflow on Hide

*For any* completed task hidden, the system SHALL remove the empty space and reflow the remaining tasks.

**Validates: Requirement 21.4**

### Property 54: Responsive Layout Adaptation

*For any* device or screen size change, the system SHALL adapt the layout to maintain usability.

**Validates: Requirement 22.1, 22.2**

### Property 55: Touch-Friendly Controls

*For any* mobile device access, the system SHALL provide touch-friendly controls.

**Validates: Requirement 22.3**

### Property 56: Serverless Architecture Cost Model

*For any* AWS resource, the system SHALL use serverless architecture with on-demand pricing to implement pay-per-use billing.

**Validates: Requirement 23.1, 23.3**

### Property 57: CloudFront Cache Efficiency

*For any* static asset request, the system SHALL implement CloudFront caching with minimum 80% cache hit ratio and 300-second TTL.

**Validates: Requirement 23.4, 23.5**

### Property 58: Efficient Database Operations

*For any* database operation, the system SHALL use efficient query patterns with appropriate indexes and batch operations where possible.

**Validates: Requirement 23.6, 23.7**

### Property 59: Cost Budget Alerts

*For any* monthly cost threshold breach (80% or 100% of $10 USD budget), the system SHALL send alert notifications to administrators.

**Validates: Requirement 23.11, 23.12, 23.13**

### Property 60: Resource Cleanup

*For any* unused resource (CloudWatch logs older than 30 days), the system SHALL implement automated cleanup.

**Validates: Requirement 23.15**

## Error Handling

### Authentication Errors

**Invalid CAPTCHA**
- Detection: CAPTCHA validation service returns failure
- Response: HTTP 400 with error message "Invalid CAPTCHA. Please try again."
- Logging: Log failed registration attempt with IP address
- User Action: User must retry registration with new CAPTCHA

**Email Already Registered**
- Detection: DynamoDB query finds existing user with email
- Response: HTTP 409 with error message "Email already registered. Please login or reset password."
- Logging: Log registration attempt with existing email
- User Action: User should login or use password reset

**Invalid Email Format**
- Detection: Email regex validation fails
- Response: HTTP 400 with error message "Invalid email format."
- User Action: User must provide valid email address

**Weak Password**
- Detection: Password validation fails complexity rules
- Response: HTTP 400 with detailed error message listing failed requirements
- User Action: User must provide password meeting all requirements

**Compromised Password**
- Detection: Password found in compromised password list
- Response: HTTP 400 with error message "This password has been compromised. Please choose a different password."
- User Action: User must choose different password

**Invalid Verification Code**
- Detection: Code doesn't match stored code or code expired
- Response: HTTP 400 with error message "Invalid or expired verification code."
- User Action: User can request new verification code

**Account Not Verified**
- Detection: User attempts login with unverified account
- Response: HTTP 403 with error message "Please verify your email address before logging in."
- User Action: User must complete email verification

**Invalid Login Credentials**
- Detection: Email not found or password hash doesn't match
- Response: HTTP 401 with error message "Invalid email or password."
- Logging: Log failed login attempt, increment failed attempt counter
- User Action: User must retry with correct credentials

**Account Locked**
- Detection: Account has lockedUntil timestamp in future
- Response: HTTP 403 with error message "Account locked due to multiple failed login attempts. Please try again later or reset your password."
- Logging: Log locked account login attempt
- User Action: User must wait for lockout period to expire or use password reset

**Session Expired**
- Detection: Session token not found or expiresAt timestamp passed
- Response: HTTP 401 with error message "Session expired. Please login again."
- User Action: User must re-authenticate

**Invalid Session Token**
- Detection: Session token not found in database
- Response: HTTP 401 with error message "Invalid session. Please login again."
- User Action: User must re-authenticate

### Task Management Errors

**Empty Task Description**
- Detection: Task description is empty or contains only whitespace
- Response: HTTP 400 with error message "Task description cannot be empty."
- User Action: User must provide non-empty description

**Task Not Found**
- Detection: Task ID doesn't exist for user
- Response: HTTP 404 with error message "Task not found."
- User Action: User should refresh task list

**Unauthorized Task Access**
- Detection: Task belongs to different user
- Response: HTTP 403 with error message "Access denied."
- Logging: Log unauthorized access attempt
- User Action: None - security violation

**Invalid Reorder Position**
- Detection: New position is negative or exceeds task count
- Response: HTTP 400 with error message "Invalid task position."
- User Action: User should retry drag operation

### Rate Limiting Errors

**IP Rate Limit Exceeded**
- Detection: Request count exceeds 100/min (or 10/min for auth)
- Response: HTTP 429 with Retry-After header
- Logging: Log rate limit event with IP and request count
- User Action: User must wait before retrying

**User Rate Limit Exceeded**
- Detection: Request count exceeds 1000/hour for authenticated user
- Response: HTTP 429 with Retry-After header
- Logging: Log rate limit event with user ID
- User Action: User must wait before retrying

### Infrastructure Errors

**DynamoDB Errors**
- Detection: DynamoDB operation throws exception
- Response: HTTP 500 with error message "Database error. Please try again."
- Logging: Log error with stack trace to CloudWatch
- Recovery: Implement exponential backoff retry for transient errors

**SES Email Delivery Failure**
- Detection: SES send email operation fails
- Response: HTTP 500 with error message "Failed to send email. Please try again later."
- Logging: Log email delivery failure
- Recovery: Implement retry queue for failed emails

**Secrets Manager Access Failure**
- Detection: Secrets Manager API call fails
- Response: HTTP 500 with error message "Service temporarily unavailable."
- Logging: Log secrets access failure with alarm trigger
- Recovery: Use cached secrets if available, alert operations team

**Encryption/Decryption Failure**
- Detection: KMS operation fails
- Response: HTTP 500 with error message "Service temporarily unavailable."
- Logging: Log encryption failure with alarm trigger
- Recovery: Alert operations team immediately

**Lambda Timeout**
- Detection: Lambda execution exceeds configured timeout
- Response: HTTP 504 with error message "Request timeout. Please try again."
- Logging: Log timeout with request details
- Recovery: Implement idempotency to allow safe retries

**API Gateway Throttling**
- Detection: API Gateway returns throttling error
- Response: HTTP 429 with Retry-After header
- Logging: Log throttling event
- Recovery: Implement exponential backoff retry on client

### Data Validation Errors

**Invalid Request Body**
- Detection: JSON parsing fails or required fields missing
- Response: HTTP 400 with error message describing validation failure
- User Action: Client must send valid request

**Invalid Query Parameters**
- Detection: Query parameter validation fails
- Response: HTTP 400 with error message describing invalid parameter
- User Action: Client must send valid parameters

**Request Size Exceeded**
- Detection: Request body exceeds size limit
- Response: HTTP 413 with error message "Request too large."
- User Action: User must reduce request size

## Testing Strategy

### Overview

The testing strategy employs a dual approach combining unit tests for specific scenarios and property-based tests for comprehensive validation of universal behaviors. This ensures both concrete correctness and general system properties are verified.

### Unit Testing

**Scope**: Specific examples, edge cases, integration points, and error conditions.

**Framework**: 
- Backend (Lambda functions): Jest with AWS SDK mocks
- Frontend: Jest with React Testing Library
- Infrastructure: AWS CDK assertions

**Test Categories**:

1. **Authentication Unit Tests**
   - Test CAPTCHA validation with valid/invalid tokens
   - Test email format validation with various formats
   - Test password complexity validation with weak/strong passwords
   - Test password hashing produces different hashes for same password
   - Test verification code generation produces unique codes
   - Test verification code expiry after 24 hours
   - Test password reset code expiry after 1 hour
   - Test account lockout after 5 failed attempts
   - Test failed login counter reset on successful login
   - Test session creation and validation
   - Test session expiry after 30 minutes inactivity
   - Test session expiry after 24 hours maximum lifetime

2. **Task Management Unit Tests**
   - Test task creation with valid description
   - Test task creation rejection with empty description
   - Test task status toggle between complete/incomplete
   - Test task deletion removes from database
   - Test task reordering updates order values
   - Test task list pagination with limit and lastKey
   - Test task filtering by completion status

3. **Security Unit Tests**
   - Test rate limiting blocks after threshold
   - Test rate limit counter reset after time window
   - Test audit log entries created for security events
   - Test encryption/decryption of sensitive data
   - Test security headers present in responses
   - Test HTTPS redirect for HTTP requests

4. **Data Isolation Unit Tests**
   - Test user can only access own tasks
   - Test user cannot access other user's tasks
   - Test user cannot modify other user's tasks
   - Test user cannot delete other user's tasks

5. **Edge Case Tests**
   - Test concurrent task updates
   - Test task reordering with single task
   - Test task reordering to same position
   - Test pagination with no more tasks
   - Test session validation with malformed token
   - Test login with non-existent email
   - Test password reset with invalid code

**Execution**:
- Run locally during development
- Run in CI/CD pipeline before deployment
- Minimum 80% code coverage required
- Fast execution (< 5 minutes for full suite)

### Property-Based Testing

**Scope**: Universal properties that should hold across all valid inputs.

**Framework**: 
- JavaScript/TypeScript: fast-check
- Minimum 100 iterations per property test

**Configuration**:
- Each test tagged with comment referencing design document property
- Tag format: `// Feature: task-manager-app, Property {number}: {property_text}`

**Property Test Categories**:

1. **Authentication Properties**
   - Property 1: CAPTCHA validation before registration
   - Property 2: Email uniqueness enforcement
   - Property 3: Password hashing before storage
   - Property 5: Email verification requirement
   - Property 6: Verification code expiry
   - Property 7: Password reset code expiry
   - Property 8: Session invalidation on password reset
   - Property 18: Password complexity enforcement
   - Property 20: Account lockout after failed attempts

2. **Session Management Properties**
   - Property 9: Session authentication
   - Property 15: Session inactivity timeout
   - Property 16: Session activity reset
   - Property 17: Maximum session lifetime

3. **Task Management Properties**
   - Property 4: One task list per user
   - Property 34: Task creation with user association
   - Property 35: Empty task rejection
   - Property 36: Task status toggle
   - Property 37: Task display filtering
   - Property 40: Multi-user data isolation
   - Property 41: Task reordering persistence
   - Property 42: Task order display

4. **Security Properties**
   - Property 10: HTTPS enforcement
   - Property 12: IP-based rate limiting
   - Property 13: User-based rate limiting
   - Property 23: Security event logging
   - Property 26: Sensitive data encryption at rest
   - Property 29: Security headers implementation

5. **Infrastructure Properties**
   - Property 30: IAM least privilege
   - Property 31: CloudTrail logging
   - Property 32: Secrets Manager usage
   - Property 56: Serverless architecture cost model

**Example Property Test**:

```typescript
// Feature: task-manager-app, Property 40: Multi-user data isolation
describe('Multi-User Data Isolation', () => {
  it('should prevent users from accessing other users tasks', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({
          userId: fc.uuid(),
          taskId: fc.uuid(),
          description: fc.string({ minLength: 1, maxLength: 500 })
        }), { minLength: 2, maxLength: 100 }),
        (tasks) => {
          // Create tasks for multiple users
          const tasksByUser = groupBy(tasks, 'userId');
          const userIds = Object.keys(tasksByUser);
          
          // For each user, verify they can only access their own tasks
          for (const userId of userIds) {
            const userTasks = listTasksForUser(userId);
            const otherUserTasks = tasks.filter(t => t.userId !== userId);
            
            // User should see all their tasks
            expect(userTasks).toHaveLength(tasksByUser[userId].length);
            
            // User should not see any other user's tasks
            for (const otherTask of otherUserTasks) {
              expect(userTasks).not.toContainEqual(
                expect.objectContaining({ taskId: otherTask.taskId })
              );
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Integration Testing

**Scope**: End-to-end workflows across multiple components.

**Approach**:
1. Deploy application to test environment
2. Execute integration test suite against deployed APIs
3. Verify database state after operations
4. Test email delivery (using SES sandbox)
5. Verify audit logs created correctly
6. Test rate limiting across multiple requests
7. Clean up test data

**Test Scenarios**:
- Complete user registration flow (register → verify → login)
- Password reset flow (request → receive email → reset → login)
- Task CRUD operations (create → update → reorder → delete)
- Session timeout and renewal
- Account lockout and unlock
- Rate limiting enforcement
- Multi-user isolation

**Frequency**: 
- Run before production deployments
- Run nightly as regression tests

### Frontend Testing

**Scope**: UI components, user interactions, responsive behavior.

**Framework**: Jest + React Testing Library

**Test Categories**:
1. Component rendering tests
2. User interaction tests (clicks, typing, drag-and-drop)
3. Form validation tests
4. Responsive layout tests
5. Accessibility tests (ARIA labels, keyboard navigation)

**Example Tests**:
- Test task creation form validates empty input
- Test task checkbox toggles completion status
- Test drag-and-drop reordering updates task order
- Test infinite scroll loads more tasks
- Test hide completed tasks toggle works
- Test responsive layout adapts to mobile screen

### Performance Testing

**Scope**: Response times, throughput, scalability.

**Metrics**:
- API response time < 200ms for p95
- Task list load time < 500ms for 1000 tasks
- Smooth scrolling with 10,000 tasks
- Lambda cold start < 1 second
- Lambda warm execution < 100ms

**Tools**: Artillery or k6 for load testing

**Test Scenarios**:
- Concurrent user logins
- Bulk task creation
- Rapid task status updates
- Infinite scroll with large task lists
- Rate limiting under load

### Security Testing

**Scope**: Authentication, authorization, data protection, vulnerability scanning.

**Test Categories**:
1. Authentication bypass attempts
2. Authorization boundary tests
3. SQL injection attempts (N/A for DynamoDB but test input validation)
4. XSS attempts in task descriptions
5. CSRF protection
6. Session hijacking attempts
7. Rate limiting bypass attempts
8. Secrets exposure in logs/responses

**Tools**:
- OWASP ZAP for vulnerability scanning
- AWS IAM Access Analyzer for permission analysis
- Manual penetration testing

**Frequency**: Before major releases and quarterly

### Test Execution in CI/CD Pipeline

**Pre-Deployment**:
1. Run unit tests (all)
2. Run property-based tests (all)
3. Run frontend tests (all)
4. Generate coverage report (require 80% minimum)
5. Run security linting (detect hardcoded secrets)
6. Fail deployment if any test fails

**Post-Deployment to Dev**:
1. Run integration tests against dev environment
2. Run smoke tests (health checks, basic workflows)
3. Verify audit logs working

**Post-Deployment to Staging**:
1. Run full integration test suite
2. Run performance tests
3. Run security scans
4. Manual QA testing

**Post-Deployment to Production**:
1. Run smoke tests
2. Monitor error rates and latency
3. Verify CloudWatch alarms configured

### Continuous Monitoring

**Metrics to Track**:
- Test execution time trends
- Test flakiness rate
- Code coverage percentage
- Property test failure rate
- Integration test success rate
- Performance regression detection

**Review Process**:
- Weekly review of test metrics
- Monthly review of test effectiveness
- Add new tests when bugs found in production
- Refactor slow tests to improve CI/CD speed

## Deployment

### CI/CD Pipeline Integration

The application is deployed through an external CI/CD pipeline managed at https://github.com/rawsco/cicdinfra. This pipeline handles:

- Automated builds and deployments
- Environment management (dev, staging, production)
- Infrastructure provisioning via AWS CDK
- Automated testing at each stage
- Rollback capabilities

**Pipeline Requirements**:
- Application must provide APPLICATION-REQUIREMENTS.md documenting:
  - Required environment variables and secrets
  - AWS resource requirements
  - Build and deployment steps
  - Post-deployment verification steps

**Deployment Stages**:
1. **Pre-Deployment**: Run all tests, security scans, and generate coverage reports
2. **Dev Deployment**: Deploy to dev environment, run integration tests
3. **Staging Deployment**: Deploy to staging, run full test suite including performance tests
4. **Production Deployment**: Deploy to production with smoke tests and monitoring

**Infrastructure as Code**:
- All AWS resources defined in CDK (lib/task-manager-stack.ts)
- Infrastructure changes deployed through the pipeline
- No manual resource creation in AWS console
- All configuration managed through code and environment variables
