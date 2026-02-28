import React, { Component, ErrorInfo, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary Component
 * 
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of crashing.
 * 
 * Features:
 * - Class-based error boundary following React best practices
 * - Animated fallback UI with retry option
 * - Error logging integration via onError callback
 * - Custom fallback support
 * - Development mode error details
 * 
 * @example
 * ```tsx
 * <ErrorBoundary onError={(error, errorInfo) => logErrorToService(error, errorInfo)}>
 *   <App />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  /**
   * Update state so the next render will show the fallback UI
   */
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  /**
   * Log error information and call optional error handler
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    
    // Call optional error handler for logging to external services
    this.props.onError?.(error, errorInfo);
  }

  /**
   * Reset error state to retry rendering
   */
  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      // Render custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Render default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="max-w-md w-full bg-card rounded-lg shadow-lg p-8 text-center border border-border"
          >
            <AlertTriangle 
              className="w-16 h-16 text-destructive mx-auto mb-4" 
              aria-hidden="true"
            />
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Something went wrong
            </h1>
            <p className="text-muted-foreground mb-6">
              We're sorry for the inconvenience. Please try refreshing the page.
            </p>
            
            {/* Show error details in development mode */}
            {import.meta.env.DEV && this.state.error && (
              <div className="mb-6">
                <details className="text-left">
                  <summary className="cursor-pointer text-sm font-medium text-foreground mb-2 hover:text-primary">
                    Error Details
                  </summary>
                  <pre className="text-xs bg-muted p-4 rounded overflow-auto max-h-48 text-destructive border border-border">
                    {this.state.error.message}
                    {this.state.error.stack && (
                      <>
                        {'\n\n'}
                        {this.state.error.stack}
                      </>
                    )}
                  </pre>
                </details>
              </div>
            )}
            
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              aria-label="Try again"
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
              Try Again
            </button>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}
