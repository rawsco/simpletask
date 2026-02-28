# BottomNavigation Component

## Overview

The `BottomNavigation` component provides a fixed bottom navigation bar optimized for mobile devices. It features thumb-accessible navigation with icons, labels, and active state highlighting.

## Features

- **Fixed Positioning**: Stays at the bottom of the viewport for easy thumb access
- **Safe Area Support**: Automatically adjusts for notched devices (iPhone X+, etc.)
- **Active State**: Highlights the current navigation item with animation
- **Badge Support**: Displays notification badges on navigation items
- **Glassmorphism**: Backdrop blur effect for modern visual design
- **Accessibility**: Full keyboard navigation and screen reader support
- **Responsive**: Only visible on mobile viewports (<768px)
- **Reduced Motion**: Respects user's motion preferences

## Requirements

Implements requirements: 21.1, 21.2, 21.3, 21.4, 21.5

## Usage

### Basic Example

```tsx
import { BottomNavigation, NavigationItem } from './components/BottomNavigation';
import { Home, CheckSquare, Calendar, User } from 'lucide-react';
import { useState } from 'react';

function App() {
  const [activeItem, setActiveItem] = useState('home');

  const navigationItems: NavigationItem[] = [
    {
      id: 'home',
      label: 'Home',
      icon: Home,
      href: '/',
    },
    {
      id: 'tasks',
      label: 'Tasks',
      icon: CheckSquare,
      href: '/tasks',
      badge: 5, // Optional notification badge
    },
    {
      id: 'calendar',
      label: 'Calendar',
      icon: Calendar,
      href: '/calendar',
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      href: '/profile',
    },
  ];

  return (
    <div>
      {/* Your app content */}
      <BottomNavigation
        items={navigationItems}
        activeItem={activeItem}
        onItemChange={setActiveItem}
      />
    </div>
  );
}
```

### With React Router

```tsx
import { BottomNavigation, NavigationItem } from './components/BottomNavigation';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, CheckSquare, Calendar, User } from 'lucide-react';

function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const navigationItems: NavigationItem[] = [
    { id: 'home', label: 'Home', icon: Home, href: '/' },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare, href: '/tasks' },
    { id: 'calendar', label: 'Calendar', icon: Calendar, href: '/calendar' },
    { id: 'profile', label: 'Profile', icon: User, href: '/profile' },
  ];

  // Determine active item from current route
  const activeItem = navigationItems.find(
    item => item.href === location.pathname
  )?.id || 'home';

  const handleItemChange = (itemId: string) => {
    const item = navigationItems.find(i => i.id === itemId);
    if (item) {
      navigate(item.href);
    }
  };

  return (
    <>
      {/* Your routes */}
      <BottomNavigation
        items={navigationItems}
        activeItem={activeItem}
        onItemChange={handleItemChange}
      />
    </>
  );
}
```

## Props

### BottomNavigationProps

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `items` | `NavigationItem[]` | Yes | - | Array of navigation items to display |
| `activeItem` | `string` | Yes | - | ID of the currently active navigation item |
| `onItemChange` | `(itemId: string) => void` | Yes | - | Callback when a navigation item is clicked |
| `className` | `string` | No | - | Additional CSS classes to apply |

### NavigationItem

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | `string` | Yes | Unique identifier for the navigation item |
| `label` | `string` | Yes | Display label for the navigation item |
| `icon` | `LucideIcon` | Yes | Icon component from lucide-react |
| `href` | `string` | Yes | URL path for the navigation item |
| `badge` | `number` | No | Optional notification badge count |

## Styling

The component uses Tailwind CSS classes and can be customized through:

1. **Custom Classes**: Pass additional classes via the `className` prop
2. **CSS Variables**: Modify theme colors in your Tailwind config
3. **Tailwind Config**: Extend the theme for custom colors and spacing

### Key CSS Classes

- `bg-background/95 backdrop-blur-md` - Glassmorphism effect
- `pb-safe` - Safe area inset support
- `md:hidden` - Only visible on mobile
- `focus-visible:ring-2` - Keyboard focus indicator

## Accessibility

The component follows WCAG 2.1 AA guidelines:

- **Keyboard Navigation**: Full keyboard support with Tab/Shift+Tab
- **Focus Indicators**: Clear 2px focus ring on interactive elements
- **ARIA Labels**: Proper `aria-label` and `aria-current` attributes
- **Screen Readers**: Semantic HTML with `role="navigation"`
- **Touch Targets**: Minimum 44x44px touch targets for mobile

### Keyboard Shortcuts

- `Tab` - Move to next navigation item
- `Shift+Tab` - Move to previous navigation item
- `Enter` or `Space` - Activate navigation item

## Safe Area Insets

The component automatically handles safe area insets for devices with notches or home indicators:

```css
/* Automatically applied */
pb-safe
supports-[padding:env(safe-area-inset-bottom)]:pb-[env(safe-area-inset-bottom)]
```

This ensures the navigation bar doesn't overlap with:
- iPhone X+ home indicator
- Android gesture navigation
- Other device-specific UI elements

## Animation

The component uses Framer Motion for smooth animations:

- **Initial Load**: Slides up from bottom with fade-in
- **Active Indicator**: Smooth transition between items
- **Badge**: Spring animation when appearing
- **Reduced Motion**: Respects `prefers-reduced-motion` setting

## Best Practices

1. **Limit Items**: Use 3-5 navigation items for optimal usability
2. **Clear Labels**: Keep labels short (1-2 words)
3. **Consistent Icons**: Use icons from the same icon set (lucide-react)
4. **Badge Usage**: Only show badges for important notifications
5. **Active State**: Always maintain an active item for context

## Browser Support

- Modern browsers with CSS Grid and Flexbox support
- iOS Safari 12+
- Chrome/Edge 90+
- Firefox 88+
- Safe area insets require iOS 11+ or Android 9+

## Related Components

- `StickyHeader` - Fixed header navigation
- `CollapsibleSidebar` - Desktop sidebar navigation
- `AppShell` - Main layout component

## Examples

### With Notification Badges

```tsx
const items: NavigationItem[] = [
  { id: 'home', label: 'Home', icon: Home, href: '/' },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare, href: '/tasks', badge: 12 },
  { id: 'messages', label: 'Messages', icon: MessageSquare, href: '/messages', badge: 3 },
  { id: 'profile', label: 'Profile', icon: User, href: '/profile' },
];
```

### Custom Styling

```tsx
<BottomNavigation
  items={items}
  activeItem={activeItem}
  onItemChange={handleChange}
  className="bg-gradient-to-t from-primary-900 to-primary-800"
/>
```

### Dynamic Badge Updates

```tsx
function App() {
  const [unreadCount, setUnreadCount] = useState(0);

  const items: NavigationItem[] = [
    { id: 'home', label: 'Home', icon: Home, href: '/' },
    { 
      id: 'messages', 
      label: 'Messages', 
      icon: MessageSquare, 
      href: '/messages',
      badge: unreadCount // Dynamically updated
    },
  ];

  // Update badge when new messages arrive
  useEffect(() => {
    const subscription = messageService.subscribe((count) => {
      setUnreadCount(count);
    });
    return () => subscription.unsubscribe();
  }, []);

  return <BottomNavigation items={items} {...props} />;
}
```

## Testing

### Unit Test Example

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { BottomNavigation } from './BottomNavigation';
import { Home, CheckSquare } from 'lucide-react';

test('highlights active navigation item', () => {
  const items = [
    { id: 'home', label: 'Home', icon: Home, href: '/' },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare, href: '/tasks' },
  ];

  render(
    <BottomNavigation
      items={items}
      activeItem="home"
      onItemChange={() => {}}
    />
  );

  const homeButton = screen.getByLabelText('Home');
  expect(homeButton).toHaveAttribute('aria-current', 'page');
});

test('calls onItemChange when item is clicked', () => {
  const handleChange = jest.fn();
  const items = [
    { id: 'home', label: 'Home', icon: Home, href: '/' },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare, href: '/tasks' },
  ];

  render(
    <BottomNavigation
      items={items}
      activeItem="home"
      onItemChange={handleChange}
    />
  );

  fireEvent.click(screen.getByLabelText('Tasks'));
  expect(handleChange).toHaveBeenCalledWith('tasks');
});
```

## Troubleshooting

### Navigation bar overlaps content

Add bottom padding to your main content area:

```tsx
<main className="pb-20 md:pb-0">
  {/* Your content */}
</main>
```

### Safe area insets not working

Ensure your viewport meta tag includes `viewport-fit=cover`:

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```

### Icons not displaying

Make sure lucide-react is installed:

```bash
npm install lucide-react
```

## Performance

- **Lightweight**: ~2KB gzipped (excluding dependencies)
- **Optimized Animations**: Uses CSS transforms for 60fps performance
- **No Re-renders**: Memoized components prevent unnecessary updates
- **Lazy Loading**: Icons can be lazy-loaded if needed
