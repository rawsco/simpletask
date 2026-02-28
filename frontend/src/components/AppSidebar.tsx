import { ReactNode } from 'react';

interface AppSidebarProps {
  children: ReactNode;
}

/**
 * AppSidebar - Sidebar component for use with AppShell
 * 
 * Provides a container for navigation and sidebar content
 */
export function AppSidebar({ children }: AppSidebarProps) {
  return (
    <nav className="flex flex-col gap-2 p-4">
      {children}
    </nav>
  );
}

interface SidebarItemProps {
  label: string;
  active?: boolean;
  onClick?: () => void;
}

/**
 * SidebarItem - Individual navigation item for the sidebar
 */
export function SidebarItem({ label, active = false, onClick }: SidebarItemProps) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left px-4 py-2 rounded-lg transition-colors
        ${active 
          ? 'bg-primary-500 text-white' 
          : 'text-foreground hover:bg-background-tertiary'
        }
      `}
    >
      {label}
    </button>
  );
}
