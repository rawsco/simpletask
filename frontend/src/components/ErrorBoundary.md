# ErrorBoundary Component

A React error boundary component that catches JavaScript errors anywhere in the child component tree, logs those errors, and displays a fallback UI instead of crashing the entire application.

## Features

- **Error Catching**: Catches JavaScript errors in child component tree
- **Graceful Fallback**: Displays user-friendly error UI with animation
- **Error Recovery**: Provides retry button for error recovery
- **Error Logging**: Integrates with error tracking services via callback
- **Custom Fallback**: Supports custom error UI components
- **Development Mode**: Shows detailed error information in dev environment
- **Accessibility**: Fully accessible with ARIA labels and keyboard support
- **Responsive Design**: Works seamlessly on all screen sizes

## Usage

### Basic Usage

Wrap your application or specific components with ErrorBoundary:

```tsx
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <YourApp />
    </ErrorBoundary>
  );
}
```

### With Error Logging

Integrate with error tracking services:

```tsx
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  const handleError = (error: Error, errorInfo: ErrorInfo) => {
    // Log to error tracking service (e.g., Sentry, LogRocket)
    console.error('Error:', error);
    console.error('Component Stack:', errorInfo.componentStack);
    
    // Example: Send to Sentry
    // Sentry.captureException(error, { extra: errorInfo });
  };

  return (
    <ErrorBoundary onError={handleError}>
      <YourApp />
    </ErrorBoundary>
  );
}
```

### With Custom Fallback

Provide a custom error UI:

```tsx
import { ErrorBoundary } from './components/ErrorBoundary';

const CustomErrorFallback = () => (
  <div className="custom-error">
    <h1>Oops! Something went wrong</h1>
    <p>Please contact support if this persists.</p>
  </div>
);

function App() {
  return (
    <ErrorBoundary fallback={<CustomErrorFallback />}>
      <YourApp />
    </ErrorBoundary>
  );
}
```

### Multiple Error Boundaries

Use multiple error boundaries to isolate errors:

```tsx
function App() {
  return (
    <ErrorBoundary>
      <Header />
      
      <ErrorBoundary>
        <Sidebar />
      </ErrorBoundary>
      
      <ErrorBoundary>
        <MainContent />
      </ErrorBoundary>
      
      <Footer />
    </ErrorBoundary>
  );
}
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `children` | `ReactNode` | Yes | - | Child components to be wrapped |
| `fallback` | `ReactNode` | No | Default UI | Custom fallback UI to display on error |
| `onError` | `(error: Error, errorInfo: ErrorInfo) => void` | No | - | Callback function called when error occurs |

## Default Error UI

The default error UI includes:

- **Error Icon**: AlertTriangle icon to indicate error state
- **Error Message**: User-friendly message explaining the error
- **Retry Button**: Allows users to attempt recovery
- **Error Details**: Stack trace visible in development mode only
- **Animations**: Smooth fade-in animation using Framer Motion

## Error Recovery

The retry button resets the error boundary state, allowing the component tree to re-render. This is useful when:

- The error was temporary (e.g., network issue)
- User action might resolve the issue
- Component state can be recovered

**Note**: The retry button simply resets the error state. If the underlying issue persists, the error will occur again.

## Error Logging Integration

The `onError` callback receives two parameters:

1. **error**: The Error object that was thrown
2. **errorInfo**: Object containing `componentStack` string

Use this callback to:

- Log errors to external services (Sentry, LogRocket, etc.)
- Track error metrics and analytics
- Send error reports to your backend
- Trigger alerts for critical errors

Example with Sentry:

```tsx
import * as Sentry from '@sentry/react';

<ErrorBoundary
  onError={(error, errorInfo) => {
    Sentry.captureException(error, {
      extra: {
        componentStack: errorInfo.componentStack,
      },
    });
  }}
>
  <App />
</ErrorBoundary>
```

## Development vs Production

### Development Mode

In development mode (`import.meta.env.DEV`), the error UI displays:

- Full error message
- Complete stack trace
- Expandable error details section

### Production Mode

In production, the error UI shows:

- Generic user-friendly message
- No technical details or stack traces
- Clean, professional error page

## Limitations

Error boundaries do **NOT** catch errors in:

- Event handlers (use try-catch instead)
- Asynchronous code (setTimeout, promises)
- Server-side rendering
- Errors thrown in the error boundary itself

For event handlers, use try-catch:

```tsx
const handleClick = () => {
  try {
    // Code that might throw
  } catch (error) {
    handleError(error);
  }
};
```

## Accessibility

The ErrorBoundary component follows accessibility best practices:

- **ARIA Labels**: Buttons have descriptive aria-labels
- **Keyboard Navigation**: All interactive elements are keyboard accessible
- **Focus Management**: Proper focus handling for retry button
- **Screen Readers**: Error messages are announced to screen readers
- **Color Contrast**: Meets WCAG 2.1 AA standards

## Styling

The component uses Tailwind CSS with custom theme variables:

- `bg-background`: Main background color
- `bg-background-secondary`: Secondary background
- `text-foreground`: Primary text color
- `text-foreground-secondary`: Secondary text color
- `bg-primary-500`: Primary button color

Customize by modifying your Tailwind theme configuration.

## Testing

Example test cases:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

const ThrowError = () => {
  throw new Error('Test error');
};

test('catches and displays errors', () => {
  render(
    <ErrorBoundary>
      <ThrowError />
    </ErrorBoundary>
  );
  
  expect(screen.getByText('Something went wrong')).toBeInTheDocument();
});

test('calls onError callback', () => {
  const onError = jest.fn();
  
  render(
    <ErrorBoundary onError={onError}>
      <ThrowError />
    </ErrorBoundary>
  );
  
  expect(onError).toHaveBeenCalled();
});

test('resets on retry button click', () => {
  const { rerender } = render(
    <ErrorBoundary>
      <ThrowError />
    </ErrorBoundary>
  );
  
  const retryButton = screen.getByRole('button', { name: /try again/i });
  fireEvent.click(retryButton);
  
  // Component should attempt to re-render
});
```

## Best Practices

1. **Place at App Root**: Wrap your entire app with an ErrorBoundary
2. **Strategic Placement**: Add boundaries around major features
3. **Log All Errors**: Always provide an onError callback
4. **Custom Fallbacks**: Use custom fallbacks for better UX
5. **Test Error States**: Test error scenarios in development
6. **Monitor Production**: Track errors in production environments
7. **Graceful Degradation**: Design fallbacks that maintain core functionality

## Related Components

- **error-handler.ts**: Error handling utilities and AppError class
- **Toast**: For displaying non-critical error notifications
- **SkeletonLoader**: For loading states that prevent errors

## Browser Support

Works in all modern browsers that support:

- React 18+
- ES6+ features
- CSS custom properties

## Performance

The ErrorBoundary component has minimal performance impact:

- Only renders fallback UI when errors occur
- No performance overhead during normal operation
- Lightweight component with no heavy dependencies

## Migration Guide

If you're adding ErrorBoundary to an existing app:

1. Install dependencies (already included in this project)
2. Import ErrorBoundary component
3. Wrap your app or specific components
4. Add error logging integration
5. Test error scenarios
6. Monitor errors in production

## Example

See `ErrorBoundaryExample.tsx` for a complete interactive example demonstrating all features.
