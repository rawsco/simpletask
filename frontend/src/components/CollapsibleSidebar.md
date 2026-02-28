# CollapsibleSidebar Component

## Overview

The `CollapsibleSidebar` component provides an animated sidebar with expand/collapse functionality. It features smooth animations, icon-only collapsed state, localStorage persistence, and responsive behavior.

## Features

- **Smooth Animations**: 300ms expand/collapse animation using Framer Motion
- **Icon-Only Collapsed State**: Displays icons only when collapsed for space efficiency
- **State Persistence**: Saves collapsed state to localStorage across sessions
- **Responsive Breakpoints**: Auto-collapses on screens <1024px
- **Accessibility**: Proper ARIA labels and keyboard navigation support
- **Reduced Motion Support**: Respects user's motion preferences

## Requirements

Implements requirements: 22.1, 22.2, 22.3, 22.4, 22.5

## Props

```typescript
interface CollapsibleSidebarProps {
  children: ReactNode;           // Sidebar content
  defaultCollapsed?: boolean;    // Initial collapsed state (default: false)
  onCollapsedChange?: (collapsed: boolean) => void;  // Callback when state changes
  collapsedWidth?: number;       // Width in pixels when collapsed (default: 64)
  expandedWidth?: number;        // Width in pixels when expanded (default: 256)
}
```

## Usage

### Basic Usage

```tsx
import { CollapsibleSidebar } from './components/CollapsibleSidebar';
import { AppSidebar, SidebarItem } from './components/AppSidebar';

function App() {
  return (
    <div className="flex">
      <CollapsibleSidebar>
        <AppSidebar>
          <SidebarItem label="Dashboard" active />
          <SidebarItem label="Tasks" />
          <SidebarItem label="Settings" />
        </AppSidebar>
      </CollapsibleSidebar>
      
      <main className="flex-1">
        {/* Main content */}
      </main>
    </div>
  );
}
```

### With Custom Widths

```tsx
<CollapsibleSidebar
  collapsedWidth={80}
  expandedWidth={320}
>
  {/* Sidebar content */}
</CollapsibleSidebar>
```

### With State Callback

```tsx
function App() {
  const handleSidebarChange = (collapsed: boolean) => {
    console.log('Sidebar is now:', collapsed ? 'collapsed' : 'expanded');
  };

  return (
    <CollapsibleSidebar onCollapsedChange={handleSidebarChange}>
      {/* Sidebar content */}
    </CollapsibleSidebar>
  );
}
```

### Default Collapsed

```tsx
<CollapsibleSidebar defaultCollapsed>
  {/* Sidebar content */}
</CollapsibleSidebar>
```

## Responsive Behavior

The sidebar automatically responds to screen size changes:

- **Desktop (≥1024px)**: Sidebar can be expanded or collapsed by user
- **Tablet/Mobile (<1024px)**: Sidebar auto-collapses to save space

## State Persistence

The collapsed state is automatically saved to localStorage with the key `sidebar-collapsed`. This ensures the user's preference is maintained across browser sessions.

## Accessibility

- Toggle button has proper ARIA labels (`aria-label`, `aria-expanded`)
- Keyboard accessible (can be toggled with Enter/Space when focused)
- Respects `prefers-reduced-motion` system preference

## Animation Details

- **Expand/Collapse Duration**: 300ms
- **Content Fade Duration**: 150ms
- **Easing**: easeInOut for smooth transitions
- **Reduced Motion**: Animations disabled when user prefers reduced motion

## Styling

The component uses Tailwind CSS classes and respects the theme system:

- Background: `bg-background-secondary`
- Border: `border-border`
- Toggle button: Hover effects with `hover:bg-background-tertiary`

## Integration with AppShell

The CollapsibleSidebar can be used with the AppShell component:

```tsx
import { AppShell } from './components/AppShell';
import { CollapsibleSidebar } from './components/CollapsibleSidebar';
import { AppHeader } from './components/AppHeader';
import { AppSidebar } from './components/AppSidebar';

function App() {
  return (
    <AppShell
      header={<AppHeader />}
      sidebar={
        <CollapsibleSidebar>
          <AppSidebar>
            {/* Navigation items */}
          </AppSidebar>
        </CollapsibleSidebar>
      }
    >
      {/* Main content */}
    </AppShell>
  );
}
```

## Notes

- The component uses `AnimatePresence` for smooth content transitions
- The toggle button is positioned absolutely in the top-right corner
- Content is scrollable when it exceeds the sidebar height
- The component handles localStorage errors gracefully
