import { useState } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { AlertCircle } from 'lucide-react';

/**
 * Component that can throw errors for demonstration
 */
const BuggyComponent = ({ shouldError }: { shouldError: boolean }) => {
  if (shouldError) {
    throw new Error('This is a simulated error for demonstration purposes');
  }

  return (
    <div className="p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
      <p className="text-green-800 dark:text-green-200">
        ✓ Component is working correctly
      </p>
    </div>
  );
};

/**
 * ErrorBoundary Example Component
 * 
 * Demonstrates the ErrorBoundary component functionality:
 * - Catching and displaying errors
 * - Error recovery with retry
 * - Custom error logging
 * - Graceful error handling
 */
export function ErrorBoundaryExample() {
  const [shouldError, setShouldError] = useState(false);
  const [errorLog, setErrorLog] = useState<string[]>([]);

  const handleError = (error: Error) => {
    const timestamp = new Date().toLocaleTimeString();
    setErrorLog((prev) => [...prev, `[${timestamp}] ${error.message}`]);
  };

  const triggerError = () => {
    setShouldError(true);
  };

  const resetError = () => {
    setShouldError(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          ErrorBoundary Component
        </h1>
        <p className="text-foreground-secondary">
          Demonstrates error catching and recovery functionality
        </p>
      </div>

      {/* Controls */}
      <div className="bg-card p-4 rounded-lg border border-border">
        <h2 className="text-lg font-semibold text-foreground mb-3">Controls</h2>
        <div className="flex gap-3">
          <button
            onClick={triggerError}
            className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors"
          >
            Trigger Error
          </button>
          <button
            onClick={resetError}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Reset Component
          </button>
        </div>
      </div>

      {/* Error Boundary Demo */}
      <div className="bg-card p-4 rounded-lg border border-border">
        <h2 className="text-lg font-semibold text-foreground mb-3">
          Component with Error Boundary
        </h2>
        <ErrorBoundary onError={handleError}>
          <BuggyComponent shouldError={shouldError} />
        </ErrorBoundary>
      </div>

      {/* Error Log */}
      {errorLog.length > 0 && (
        <div className="bg-card p-4 rounded-lg border border-border">
          <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Error Log
          </h2>
          <div className="space-y-2">
            {errorLog.map((log, index) => (
              <div
                key={index}
                className="p-2 bg-destructive/10 border border-destructive/20 rounded text-sm font-mono text-destructive"
              >
                {log}
              </div>
            ))}
          </div>
          <button
            onClick={() => setErrorLog([])}
            className="mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear Log
          </button>
        </div>
      )}

      {/* Usage Example */}
      <div className="bg-card p-4 rounded-lg border border-border">
        <h2 className="text-lg font-semibold text-foreground mb-3">
          Usage Example
        </h2>
        <pre className="text-sm bg-muted p-4 rounded overflow-x-auto border border-border">
          <code>{`import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary 
      onError={(error, errorInfo) => {
        // Log to error tracking service
        console.error('Error:', error, errorInfo);
      }}
    >
      <YourApp />
    </ErrorBoundary>
  );
}

// With custom fallback
<ErrorBoundary 
  fallback={<CustomErrorPage />}
>
  <YourComponent />
</ErrorBoundary>`}</code>
        </pre>
      </div>

      {/* Features */}
      <div className="bg-card p-4 rounded-lg border border-border">
        <h2 className="text-lg font-semibold text-foreground mb-3">Features</h2>
        <ul className="space-y-2 text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">•</span>
            <span>
              <strong className="text-foreground">Error Catching:</strong> Catches
              JavaScript errors in child component tree
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">•</span>
            <span>
              <strong className="text-foreground">Graceful Fallback:</strong> Displays
              user-friendly error UI instead of crashing
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">•</span>
            <span>
              <strong className="text-foreground">Error Recovery:</strong> Retry button
              allows users to attempt recovery
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">•</span>
            <span>
              <strong className="text-foreground">Error Logging:</strong> Integrates with
              error tracking services via onError callback
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">•</span>
            <span>
              <strong className="text-foreground">Custom Fallback:</strong> Supports
              custom error UI components
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">•</span>
            <span>
              <strong className="text-foreground">Dev Mode Details:</strong> Shows error
              stack traces in development
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
