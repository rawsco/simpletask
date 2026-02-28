import { ReactNode } from 'react';

interface AppHeaderProps {
  title?: string;
  actions?: ReactNode;
}

/**
 * AppHeader - Header component for use with AppShell
 * 
 * Provides a consistent header layout with title and action buttons
 */
export function AppHeader({ title = 'Task Manager', actions }: AppHeaderProps) {
  return (
    <div className="flex items-center justify-between h-16 px-4 md:px-6">
      <h1 className="text-xl md:text-2xl font-bold text-foreground">{title}</h1>
      {actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}
