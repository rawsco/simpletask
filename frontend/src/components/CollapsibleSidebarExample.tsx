import { useState } from 'react';
import { CollapsibleSidebar } from './CollapsibleSidebar';
import { AppSidebar, SidebarItem } from './AppSidebar';

/**
 * CollapsibleSidebarExample - Demonstrates CollapsibleSidebar usage
 * 
 * Shows:
 * - Basic sidebar with navigation items
 * - Icon-only collapsed state
 * - State change callback
 * - Integration with AppSidebar
 */
export function CollapsibleSidebarExample() {
  const [activeItem, setActiveItem] = useState('dashboard');
  const [sidebarState, setSidebarState] = useState<string>('expanded');

  const handleSidebarChange = (collapsed: boolean) => {
    setSidebarState(collapsed ? 'collapsed' : 'expanded');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center px-4">
          <h1 className="text-xl font-bold text-foreground">
            CollapsibleSidebar Example
          </h1>
          <div className="ml-auto text-sm text-foreground-secondary">
            Sidebar: <span className="font-medium">{sidebarState}</span>
          </div>
        </div>
      </header>

      {/* Main layout */}
      <div className="flex">
        {/* Collapsible Sidebar */}
        <CollapsibleSidebar onCollapsedChange={handleSidebarChange}>
          <AppSidebar>
            <SidebarItem
              label="Dashboard"
              active={activeItem === 'dashboard'}
              onClick={() => setActiveItem('dashboard')}
            />
            <SidebarItem
              label="Tasks"
              active={activeItem === 'tasks'}
              onClick={() => setActiveItem('tasks')}
            />
            <SidebarItem
              label="Documents"
              active={activeItem === 'documents'}
              onClick={() => setActiveItem('documents')}
            />
            <SidebarItem
              label="Profile"
              active={activeItem === 'profile'}
              onClick={() => setActiveItem('profile')}
            />
            <SidebarItem
              label="Settings"
              active={activeItem === 'settings'}
              onClick={() => setActiveItem('settings')}
            />
          </AppSidebar>
        </CollapsibleSidebar>

        {/* Main content */}
        <main className="flex-1 p-8">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-foreground mb-6">
              CollapsibleSidebar Component
            </h2>

            <div className="space-y-6">
              {/* Feature cards */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-6 rounded-lg border border-border bg-background-secondary">
                  <h3 className="font-semibold mb-2 text-foreground">
                    Smooth Animations
                  </h3>
                  <p className="text-sm text-foreground-secondary">
                    The sidebar expands and collapses with a smooth 300ms animation.
                    Click the toggle button to see it in action.
                  </p>
                </div>

                <div className="p-6 rounded-lg border border-border bg-background-secondary">
                  <h3 className="font-semibold mb-2 text-foreground">
                    Icon-Only Collapsed State
                  </h3>
                  <p className="text-sm text-foreground-secondary">
                    When collapsed, the sidebar shows only icons to save space while
                    maintaining navigation functionality.
                  </p>
                </div>

                <div className="p-6 rounded-lg border border-border bg-background-secondary">
                  <h3 className="font-semibold mb-2 text-foreground">
                    State Persistence
                  </h3>
                  <p className="text-sm text-foreground-secondary">
                    Your sidebar preference is saved to localStorage and restored
                    when you return to the page.
                  </p>
                </div>

                <div className="p-6 rounded-lg border border-border bg-background-secondary">
                  <h3 className="font-semibold mb-2 text-foreground">
                    Responsive Breakpoints
                  </h3>
                  <p className="text-sm text-foreground-secondary">
                    The sidebar automatically collapses on screens smaller than 1024px
                    to optimize for mobile and tablet devices.
                  </p>
                </div>
              </div>

              {/* Usage instructions */}
              <div className="p-6 rounded-lg border border-border bg-background-secondary">
                <h3 className="font-semibold mb-4 text-foreground">
                  Try It Out
                </h3>
                <ul className="space-y-2 text-sm text-foreground-secondary">
                  <li>• Click the toggle button (chevron icon) to collapse/expand the sidebar</li>
                  <li>• Resize your browser window below 1024px to see auto-collapse</li>
                  <li>• Refresh the page - your sidebar state will be preserved</li>
                  <li>• Navigate between items to see the active state</li>
                </ul>
              </div>

              {/* Technical details */}
              <div className="p-6 rounded-lg border border-border bg-background-secondary">
                <h3 className="font-semibold mb-4 text-foreground">
                  Technical Details
                </h3>
                <div className="space-y-2 text-sm text-foreground-secondary">
                  <p><strong>Collapsed Width:</strong> 64px</p>
                  <p><strong>Expanded Width:</strong> 256px</p>
                  <p><strong>Animation Duration:</strong> 300ms</p>
                  <p><strong>Storage Key:</strong> sidebar-collapsed</p>
                  <p><strong>Breakpoint:</strong> 1024px</p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
