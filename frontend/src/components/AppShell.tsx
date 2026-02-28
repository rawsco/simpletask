import { ReactNode } from 'react';

interface AppShellProps {
  children: ReactNode;
  header: ReactNode;
  sidebar?: ReactNode;
  footer?: ReactNode;
}

/**
 * AppShell - Main layout component with responsive behavior
 * 
 * Provides a flexible layout structure with:
 * - Fixed header at the top
 * - Optional collapsible sidebar
 * - Main content area
 * - Optional footer
 * 
 * Responsive breakpoints:
 * - Mobile (<768px): Single column, no sidebar
 * - Tablet (768px-1024px): Collapsible sidebar
 * - Desktop (>1024px): Full layout with sidebar
 */
export function AppShell({ children, header, sidebar, footer }: AppShellProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header - Fixed at top */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        {header}
      </header>

      {/* Main layout container */}
      <div className="flex-1 flex">
        {/* Sidebar - Hidden on mobile, collapsible on tablet/desktop */}
        {sidebar && (
          <aside className="hidden md:flex md:w-64 lg:w-72 border-r border-border bg-background-secondary">
            <div className="flex-1 overflow-y-auto">
              {sidebar}
            </div>
          </aside>
        )}

        {/* Main content area */}
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-4 py-6 md:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>

      {/* Footer - Optional */}
      {footer && (
        <footer className="border-t border-border bg-background-secondary">
          {footer}
        </footer>
      )}
    </div>
  );
}
