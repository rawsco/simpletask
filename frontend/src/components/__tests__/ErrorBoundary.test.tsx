import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ErrorBoundary } from '../ErrorBoundary';

// Component that throws an error
const ThrowError = ({ shouldThrow = true }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

describe('ErrorBoundary', () => {
  // Suppress console.error for cleaner test output
  const originalError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalError;
  });

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('renders error UI when child component throws', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(
      screen.getByText("We're sorry for the inconvenience. Please try refreshing the page.")
    ).toBeInTheDocument();
  });

  it('displays error icon in error state', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    // Check for AlertTriangle icon (lucide-react renders as svg)
    const icon = screen.getByRole('img', { hidden: true });
    expect(icon).toBeInTheDocument();
  });

  it('displays retry button in error state', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    const retryButton = screen.getByRole('button', { name: /try again/i });
    expect(retryButton).toBeInTheDocument();
  });

  it('calls onError callback when error occurs', () => {
    const onError = vi.fn();

    render(
      <ErrorBoundary onError={onError}>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String),
      })
    );
  });

  it('resets error state when retry button is clicked', () => {
    let shouldThrow = true;

    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={shouldThrow} />
      </ErrorBoundary>
    );

    // Error UI should be visible
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // Fix the error condition
    shouldThrow = false;

    // Click retry button
    const retryButton = screen.getByRole('button', { name: /try again/i });
    fireEvent.click(retryButton);

    // Re-render with fixed component
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={shouldThrow} />
      </ErrorBoundary>
    );

    // Should show normal content
    expect(screen.getByText('No error')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  it('renders custom fallback when provided', () => {
    const customFallback = <div>Custom error message</div>;

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom error message')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  it('logs error to console', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error');

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('has accessible retry button', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    const retryButton = screen.getByRole('button', { name: /try again/i });
    expect(retryButton).toHaveAttribute('aria-label', 'Try again');
  });

  it('maintains error state across re-renders until reset', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // Re-render without changing anything
    rerender(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    // Error UI should still be visible
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('catches errors from nested components', () => {
    const NestedComponent = () => {
      return (
        <div>
          <div>
            <ThrowError />
          </div>
        </div>
      );
    };

    render(
      <ErrorBoundary>
        <NestedComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('applies correct styling classes', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    const container = screen.getByText('Something went wrong').closest('div');
    expect(container).toHaveClass('max-w-md', 'w-full', 'bg-card');
  });
});
