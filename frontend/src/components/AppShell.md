# AppShell Component

The `AppShell` component provides a flexible, responsive layout structure for the Task Manager application.

## Features

- **Semantic HTML**: Uses proper semantic elements (`<header>`, `<aside>`, `<main>`, `<footer>`)
- **Responsive Layout**: Automatically adapts to different screen sizes
- **Flexible Slots**: Accepts header, sidebar, footer, and main content as props
- **Sticky Header**: Header remains fixed at the top during scrolling
- **Backdrop Blur**: Modern glassmorphism effect on the header

## Responsive Behavior

### Mobile (<768px)
- Single column layout
- Sidebar is hidden
- Full-width content area
- Header and footer remain visible

### Tablet (768px - 1024px)
- Two-column layout
- Sidebar visible at 256px (16rem) width
- Content area adjusts to remaining space

### Desktop (>1024px)
- Two-column layout
- Sidebar expands to 288px (18rem) width
- Optimal reading width for content

## Usage

### Basic Usage

```tsx
import { AppShell } from './components/AppShell';

function App() {
  return (
    <AppShell
      header={<div>Header Content</div>}
    >
      <div>Main Content</div>
    </AppShell>
  );
}
```

### With Sidebar

```tsx
import { AppShell } from './components/AppShell';
import { AppSidebar, SidebarItem } from './components/AppSidebar';

function App() {
  return (
    <AppShell
      header={<div>Header Content</div>}
      sidebar={
        <AppSidebar>
          <SidebarItem label="Home" active />
          <SidebarItem label="Tasks" />
          <SidebarItem label="Settings" />
        </AppSidebar>
      }
    >
      <div>Main Content</div>
    </AppShell>
  );
}
```

### Complete Example

```tsx
import { AppShell } from './components/AppShell';
import { AppHeader } from './components/AppHeader';
import { AppSidebar, SidebarItem } from './components/AppSidebar';
import { AppFooter } from './components/AppFooter';
import { ThemeToggle } from './components/ThemeToggle';

function App() {
  return (
    <AppShell
      header={
        <AppHeader
          title="My Application"
          actions={
            <>
              <ThemeToggle variant="dropdown" />
              <button>Logout</button>
            </>
          }
        />
      }
      sidebar={
        <AppSidebar>
          <SidebarItem label="Dashboard" active />
          <SidebarItem label="Tasks" />
          <SidebarItem label="Calendar" />
          <SidebarItem label="Settings" />
        </AppSidebar>
      }
      footer={<AppFooter />}
    >
      <div>Your main content goes here</div>
    </AppShell>
  );
}
```

## Props

### AppShell

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `children` | `ReactNode` | Yes | Main content area |
| `header` | `ReactNode` | Yes | Header content (sticky at top) |
| `sidebar` | `ReactNode` | No | Sidebar content (hidden on mobile) |
| `footer` | `ReactNode` | No | Footer content |

### AppHeader

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `title` | `string` | No | "Task Manager" | Header title text |
| `actions` | `ReactNode` | No | - | Action buttons/controls |

### AppSidebar

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `children` | `ReactNode` | Yes | Sidebar navigation items |

### SidebarItem

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `label` | `string` | Yes | - | Item label text |
| `active` | `boolean` | No | `false` | Whether item is active |
| `onClick` | `() => void` | No | - | Click handler |

### AppFooter

No props - displays copyright information.

## Styling

The component uses Tailwind CSS utility classes and CSS custom properties for theming:

- `bg-background`: Main background color
- `bg-background-secondary`: Secondary background (sidebar, footer)
- `border-border`: Border color
- `text-foreground`: Primary text color
- `text-foreground-secondary`: Secondary text color

These colors automatically adapt to light/dark theme via the ThemeProvider.

## Accessibility

- Uses semantic HTML5 elements
- Proper heading hierarchy
- Keyboard navigable
- Screen reader friendly
- Focus indicators on interactive elements

## Requirements Satisfied

This component satisfies the following requirements from the Modern UX Overhaul spec:

- **37.1**: Supports viewport widths from 320px to 3840px
- **37.2**: Uses mobile-first responsive design approach
- **37.3**: Provides breakpoints at 768px and 1024px
- **37.4**: Adapts layout for each breakpoint

## Related Components

- `AppHeader`: Header component with title and actions
- `AppSidebar`: Sidebar navigation container
- `SidebarItem`: Individual navigation item
- `AppFooter`: Footer component
- `ThemeToggle`: Theme switcher component

## Example

See `AppShellExample.tsx` for a complete working example demonstrating all features.
