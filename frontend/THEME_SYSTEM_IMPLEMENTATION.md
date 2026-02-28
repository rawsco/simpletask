# Theme System Implementation

This document describes the implementation of the theme system with light/dark mode for the Task Manager application.

## Overview

The theme system provides:
- Light and dark color schemes
- System theme detection (follows OS preference)
- Theme persistence using localStorage
- Smooth color transitions (300ms)
- High contrast mode support (for accessibility)
- Mobile browser theme-color meta tag updates

## Implementation Details

### 1. ThemeProvider Context (`src/contexts/ThemeContext.tsx`)

**Features:**
- Manages theme state: 'light', 'dark', or 'system'
- Detects system theme preference using `prefers-color-scheme` media query
- Listens for system theme changes and updates automatically
- Persists theme preference to localStorage
- Applies theme classes to document root
- Updates meta theme-color for mobile browsers
- Supports high contrast mode

**API:**
```typescript
interface ThemeContextValue {
  theme: 'light' | 'dark' | 'system';
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  highContrast: boolean;
  setHighContrast: (enabled: boolean) => void;
}

// Usage
const { theme, resolvedTheme, setTheme, highContrast, setHighContrast } = useTheme();
```

**Storage Keys:**
- `task-manager-theme`: Stores theme preference ('light', 'dark', or 'system')
- `task-manager-theme-high-contrast`: Stores high contrast preference (boolean)

### 2. ThemeToggle Component (`src/components/ThemeToggle.tsx`)

**Features:**
- Dropdown menu with Light, Dark, and System options
- Visual indicator (checkmark) for current theme
- Icon-only variant for compact layouts
- Keyboard accessible
- Touch-friendly (44x44px minimum touch target)

**Props:**
```typescript
interface ThemeToggleProps {
  variant?: 'icon' | 'dropdown';  // Default: 'dropdown'
  showLabel?: boolean;             // Default: false
}
```

**Variants:**
- `icon`: Simple toggle button that switches between light/dark
- `dropdown`: Full dropdown menu with all three options (Light, Dark, System)

### 3. Dropdown Menu Component (`src/components/ui/dropdown-menu.tsx`)

**Features:**
- Built on Radix UI primitives
- Accessible (WCAG 2.1 AA compliant)
- Keyboard navigation support
- Smooth animations
- Customizable styling with Tailwind CSS

**Components:**
- `DropdownMenu`: Root component
- `DropdownMenuTrigger`: Button that opens the menu
- `DropdownMenuContent`: Menu container
- `DropdownMenuItem`: Individual menu item
- Plus: CheckboxItem, RadioItem, Label, Separator, etc.

### 4. CSS Variables (`src/index.css`)

**Theme Colors:**
```css
:root {
  /* Shadcn/ui variables (HSL format) */
  --background: 0 0% 100%;
  --foreground: 0 0% 9%;
  --primary: 262 83% 58%;
  /* ... more variables */
  
  /* Custom color palette */
  --primary-50: #f5f3ff;
  --primary-500: #8b5cf6;
  --primary-900: #4c1d95;
  /* ... more shades */
}

.dark {
  /* Dark theme overrides */
  --background: 0 0% 4%;
  --foreground: 0 0% 98%;
  /* ... dark mode variables */
}

.high-contrast {
  /* High contrast overrides */
  --primary-500: #6d28d9;
}
```

**Transition:**
All color properties transition smoothly over 300ms using Tailwind's `transition-colors` utility.

### 5. App Integration (`src/App.tsx`)

The ThemeProvider wraps the entire application:

```tsx
<BrowserRouter>
  <ThemeProvider defaultTheme="system" storageKey="task-manager-theme">
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  </ThemeProvider>
</BrowserRouter>
```

### 6. UI Integration (`src/pages/TasksPage.tsx`)

The ThemeToggle is added to the page header:

```tsx
<div className="page-header">
  <h1>My Tasks</h1>
  <div className="flex items-center gap-2">
    <ThemeToggle variant="dropdown" />
    <button onClick={handleLogout}>Logout</button>
  </div>
</div>
```

## Requirements Satisfied

This implementation satisfies the following requirements from the design document:

### Requirement 1.1: Light and Dark Color Schemes
✅ Theme system provides both light and dark color schemes

### Requirement 1.2: Indigo/Purple Accent Colors
✅ Uses indigo/purple palette (--primary-500: #8b5cf6)

### Requirement 1.6: Smooth Color Transitions
✅ All colors transition smoothly within 300ms

### Requirement 31.2: System High Contrast Detection
✅ High contrast mode can be enabled (API ready, UI toggle pending)

### Requirement 31.3: Increased Contrast in High Contrast Mode
✅ High contrast styles defined in CSS

### Requirement 31.4: Manual High Contrast Toggle
⚠️ API implemented, UI toggle not yet exposed (future enhancement)

## File Structure

```
frontend/src/
├── contexts/
│   └── ThemeContext.tsx          # Theme provider and hook
├── components/
│   ├── ThemeToggle.tsx           # Theme toggle UI component
│   ├── ui/
│   │   └── dropdown-menu.tsx     # Dropdown menu component
│   └── __tests__/
│       └── ThemeSystem.manual-test.md  # Manual test guide
├── index.css                     # CSS variables and theme styles
└── App.tsx                       # ThemeProvider integration
```

## Usage Examples

### Basic Usage

```tsx
import { useTheme } from '@/contexts/ThemeContext';

function MyComponent() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  
  return (
    <div>
      <p>Current theme: {theme}</p>
      <p>Resolved theme: {resolvedTheme}</p>
      <button onClick={() => setTheme('dark')}>Dark Mode</button>
    </div>
  );
}
```

### Using ThemeToggle

```tsx
import { ThemeToggle } from '@/components/ThemeToggle';

// Dropdown variant (default)
<ThemeToggle variant="dropdown" />

// Icon variant (simple toggle)
<ThemeToggle variant="icon" />

// With label
<ThemeToggle variant="dropdown" showLabel />
```

### Programmatic Theme Control

```tsx
// Set specific theme
setTheme('dark');
setTheme('light');
setTheme('system');

// Enable high contrast
setHighContrast(true);

// Check current theme
if (resolvedTheme === 'dark') {
  // Dark mode specific logic
}
```

## Browser Support

- Modern browsers with CSS custom properties support
- `prefers-color-scheme` media query support
- localStorage support
- Graceful degradation for older browsers

## Accessibility

- ✅ Keyboard navigation (Tab, Enter, Arrow keys)
- ✅ Focus indicators on all interactive elements
- ✅ ARIA labels and roles
- ✅ Touch-friendly targets (44x44px minimum)
- ✅ Respects `prefers-reduced-motion` (via existing CSS)
- ✅ High contrast mode support (API ready)
- ⚠️ Screen reader announcements (to be tested)

## Performance

- Minimal JavaScript overhead
- CSS custom properties for instant theme switching
- No layout shifts during theme changes
- Efficient localStorage usage
- Smooth 300ms transitions

## Testing

### Manual Testing
See `src/components/__tests__/ThemeSystem.manual-test.md` for comprehensive manual test cases.

### Automated Testing
⚠️ Unit tests pending (requires Vitest setup)

**Recommended tests:**
1. ThemeContext state management
2. Theme persistence in localStorage
3. System theme detection
4. Theme toggle interactions
5. Accessibility compliance

## Future Enhancements

1. **High Contrast Toggle UI**: Add a toggle in settings/preferences
2. **Theme Toggle on All Pages**: Add to Login, Register, and other pages
3. **Custom Theme Colors**: Allow users to customize accent colors
4. **Theme Presets**: Provide multiple color scheme options
5. **Animated Theme Transitions**: Add more sophisticated animations
6. **Theme Preview**: Show preview before applying
7. **Scheduled Theme Switching**: Auto-switch based on time of day
8. **Per-Page Theme**: Remember theme preference per page

## Troubleshooting

### Theme not persisting
- Check localStorage is enabled in browser
- Verify storage key matches: `task-manager-theme`
- Check browser console for errors

### Theme not applying
- Verify ThemeProvider wraps the app
- Check CSS variables are defined in index.css
- Ensure Tailwind CSS is configured correctly

### System theme not detected
- Check browser supports `prefers-color-scheme`
- Verify OS has a theme preference set
- Test in different browsers

### Transitions not smooth
- Check `prefers-reduced-motion` is not enabled
- Verify Tailwind CSS animations are working
- Check for CSS conflicts

## Related Documentation

- [Shadcn/ui Setup](./SHADCN_SETUP.md)
- [Design Document](./.kiro/specs/modern-ux-overhaul/design.md)
- [Requirements](./.kiro/specs/modern-ux-overhaul/requirements.md)

## Changelog

### v1.0.0 (Current)
- Initial implementation of theme system
- ThemeProvider context with light/dark/system modes
- ThemeToggle component with dropdown variant
- System theme detection and auto-switching
- Theme persistence in localStorage
- High contrast mode API (UI pending)
- Integration with TasksPage
