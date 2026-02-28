# Error Handling Guide

This document explains how to use the global error handling system in the Task Manager application.

## Overview

The error handling system provides:
- Custom error classes for different error types
- Centralized error handling utilities
- API error handling with automatic conversion
- Retry logic with exponential backoff

## Error Classes

### AppError (Base Class)

The base error class for all application errors.

```typescript
import { AppError, ErrorCode } from '../lib/error-handler';

throw new AppError(
  'Something went wrong',
  ErrorCode.UNKNOWN_ERROR,
  500,
  { additionalInfo: 'details' }
);
```

### ValidationError

Used for input validation failures.

```typescript
import { ValidationError } from '../lib/error-handler';

throw new ValidationError('Email is required', { field: 'email' });
```

### NetworkError

Used for network-related failures.

```typescript
import { NetworkError } from '../lib/error-handler';

throw new NetworkError('Failed to connect to server', 503);
```

### AuthenticationError

Used when authentication is required or fails.

```typescript
import { AuthenticationError } from '../lib/error-handler';

throw new AuthenticationError('Invalid credentials');
```

### AuthorizationError

Used when user lacks permission.

```typescript
import { AuthorizationError } from '../lib/error-handler';

throw new AuthorizationError('You cannot access this resource');
```

### NotFoundError

Used when a resource is not found.

```typescript
import { NotFoundError } from '../lib/error-handler';

throw new NotFoundError('Task');
// Message: "Task not found"
```

### ConflictError

Used when there's a conflict with existing data.

```typescript
import { ConflictError } from '../lib/error-handler';

throw new ConflictError('Email already exists');
```

## Error Handling Utilities

### handleError

Centralized error handler that logs errors and returns formatted error information.

```typescript
import { handleError } from '../lib/error-handler';

try {
  await someOperation();
} catch (error) {
  const { title, message, code } = handleError(error, { context: 'user-action' });
  
  // Display error to user
  toast.error(message, { title });
}
```

### handleApiError

Converts Axios errors into AppError instances. This is automatically used by the API client.

```typescript
import { handleApiError } from '../lib/error-handler';

try {
  const response = await axios.get('/api/data');
} catch (error) {
  handleApiError(error); // Throws appropriate AppError
}
```

### createErrorFromResponse

Creates an AppError from an HTTP status code.

```typescript
import { createErrorFromResponse } from '../lib/error-handler';

const error = createErrorFromResponse(404, 'Task not found');
// Returns NotFoundError instance
```

### retryWithBackoff

Retries a failed operation with exponential backoff.

```typescript
import { retryWithBackoff } from '../lib/error-handler';

const data = await retryWithBackoff(
  async () => {
    return await apiClient.getTasks();
  },
  3,    // maxRetries
  1000  // baseDelay in ms
);
```

## Usage Examples

### In Components

```typescript
import { handleError, ValidationError } from '../lib/error-handler';
import { useToast } from '../hooks/useToast';

function TaskForm() {
  const { toast } = useToast();
  
  const handleSubmit = async (data: TaskData) => {
    try {
      // Validate input
      if (!data.title) {
        throw new ValidationError('Title is required', { field: 'title' });
      }
      
      // Make API call
      await apiClient.createTask(data);
      
      toast.success('Task created successfully');
    } catch (error) {
      const { title, message } = handleError(error);
      toast.error(message, { title });
    }
  };
  
  return <form onSubmit={handleSubmit}>...</form>;
}
```

### In Services

```typescript
import { NotFoundError, NetworkError } from '../lib/error-handler';

class TaskService {
  async getTask(taskId: string): Promise<Task> {
    try {
      const response = await apiClient.get(`/tasks/${taskId}`);
      return response.data;
    } catch (error) {
      // API client already converts to AppError
      throw error;
    }
  }
  
  async deleteTask(taskId: string): Promise<void> {
    const task = await this.getTask(taskId);
    
    if (!task) {
      throw new NotFoundError('Task');
    }
    
    await apiClient.delete(`/tasks/${taskId}`);
  }
}
```

### With Retry Logic

```typescript
import { retryWithBackoff } from '../lib/error-handler';

async function fetchTasksWithRetry() {
  return await retryWithBackoff(
    async () => {
      const response = await apiClient.getTasks();
      return response.data;
    },
    3,    // Retry up to 3 times
    1000  // Start with 1 second delay
  );
}
```

## Error Checking Utilities

### isNetworkError

Check if an error is a network error.

```typescript
import { isNetworkError } from '../lib/error-handler';

try {
  await apiClient.getTasks();
} catch (error) {
  if (isNetworkError(error)) {
    // Show offline message
    toast.info('You appear to be offline');
  }
}
```

### isAuthError

Check if an error is an authentication error.

```typescript
import { isAuthError } from '../lib/error-handler';

try {
  await apiClient.getTasks();
} catch (error) {
  if (isAuthError(error)) {
    // Redirect to login
    navigate('/login');
  }
}
```

## API Client Integration

The API client automatically uses `handleApiError` to convert Axios errors:

```typescript
// In api.ts
this.client.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('session');
      window.location.href = '/login';
    }
    // Convert Axios error to AppError
    return Promise.reject(handleApiError(error));
  }
);
```

This means all API errors are automatically converted to the appropriate AppError subclass:
- 400 → ValidationError
- 401 → AuthenticationError
- 403 → AuthorizationError
- 404 → NotFoundError
- 409 → ConflictError
- 500+ → AppError with SERVER_ERROR code
- Network failures → NetworkError

## Best Practices

1. **Use specific error classes**: Use the most specific error class for your use case
2. **Include context**: Add details to errors to help with debugging
3. **Handle errors at boundaries**: Catch errors in components and services, not deep in utility functions
4. **Log errors**: Use `handleError` to ensure errors are logged properly
5. **Show user-friendly messages**: Convert technical errors to user-friendly messages
6. **Don't swallow errors**: Always handle or re-throw errors
7. **Use retry logic**: For transient failures, use `retryWithBackoff`
8. **Check error types**: Use `isNetworkError` and `isAuthError` for specific handling

## Error Codes

Available error codes:
- `VALIDATION_ERROR` - Input validation failed
- `NETWORK_ERROR` - Network request failed
- `AUTH_ERROR` - Authentication required or failed
- `AUTHORIZATION_ERROR` - Permission denied
- `NOT_FOUND` - Resource not found
- `CONFLICT` - Conflict with existing data
- `SERVER_ERROR` - Server-side error
- `UNKNOWN_ERROR` - Unknown error occurred
