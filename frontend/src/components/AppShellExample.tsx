import { AppShell } from './AppShell';
import { AppHeader } from './AppHeader';
import { AppSidebar, SidebarItem } from './AppSidebar';
import { AppFooter } from './AppFooter';
import { ThemeToggle } from './ThemeToggle';

/**
 * AppShellExample - Demonstrates the usage of AppShell component
 * 
 * This example shows:
 * - Header with title and actions
 * - Sidebar with navigation items (hidden on mobile, visible on tablet/desktop)
 * - Main content area
 * - Footer
 * 
 * Responsive behavior:
 * - Mobile (<768px): Header + Content + Footer (no sidebar)
 * - Tablet (768px-1024px): Header + Sidebar (64) + Content + Footer
 * - Desktop (>1024px): Header + Sidebar (72) + Content + Footer
 */
export function AppShellExample() {
  return (
    <AppShell
      header={
        <AppHeader
          title="My Tasks"
          actions={
            <>
              <ThemeToggle variant="dropdown" />
              <button className="px-4 py-2 bg-neutral-600 text-white rounded-lg hover:bg-neutral-700 transition-colors">
                Logout
              </button>
            </>
          }
        />
      }
      sidebar={
        <AppSidebar>
          <SidebarItem label="All Tasks" active />
          <SidebarItem label="Today" />
          <SidebarItem label="Upcoming" />
          <SidebarItem label="Completed" />
        </AppSidebar>
      }
      footer={<AppFooter />}
    >
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Welcome to Task Manager</h2>
        <p className="text-foreground-secondary">
          This is an example of the AppShell component with responsive layout.
        </p>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="p-6 bg-background-secondary rounded-lg border border-border">
            <h3 className="font-semibold mb-2">Mobile View</h3>
            <p className="text-sm text-foreground-secondary">
              On screens smaller than 768px, the sidebar is hidden and only the header, content, and footer are visible.
            </p>
          </div>
          <div className="p-6 bg-background-secondary rounded-lg border border-border">
            <h3 className="font-semibold mb-2">Tablet View</h3>
            <p className="text-sm text-foreground-secondary">
              On screens between 768px and 1024px, the sidebar appears with a width of 256px (16rem).
            </p>
          </div>
          <div className="p-6 bg-background-secondary rounded-lg border border-border">
            <h3 className="font-semibold mb-2">Desktop View</h3>
            <p className="text-sm text-foreground-secondary">
              On screens larger than 1024px, the sidebar expands to 288px (18rem) for better readability.
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
