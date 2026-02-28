# StickyHeader Component

## Overview

The `StickyHeader` component provides a fixed header that stays at the top of the viewport during scrolling, with optional backdrop blur and scroll-based shadow effects.

## Features

- **Fixed Positioning**: Header remains at the top of the viewport (Requirement 19.1)
- **Backdrop Blur**: Glassmorphism effect with configurable blur (Requirement 19.2)
- **Scroll-Based Shadow**: Shadow appears after scrolling 50px for depth perception (Requirement 19.3)
- **Proper Z-Index**: Ensures header stays above content without obscuring it (Requirement 19.4)
- **Smooth Transitions**: Animated entrance and shadow transitions
- **Accessibility**: Semantic HTML with proper header element

## Usage

### Basic Usage

```tsx
import { StickyHeader } from './components/StickyHeader';
import { AppHeader } from './components/AppHeader';

function App() {
  return (
    <>
      <StickyHeader>
        <AppHeader title="My App" />
      </StickyHeader>
      
      <main className="pt-16">
        {/* Your content here */}
        {/* pt-16 accounts for the fixed header height */}
      </main>
    </>
  );
}
```

### With Custom Actions

```tsx
<StickyHeader>
  <AppHeader
    title="Task Manager"
    actions={
      <>
        <button>Tasks</button>
        <button>Categories</button>
        <ThemeToggle />
      </>
    }
  />
</StickyHeader>
```

### Without Backdrop Blur

```tsx
<StickyHeader blurBackground={false}>
  <AppHeader title="My App" />
</StickyHeader>
```

### Without Shadow Effect

```tsx
<StickyHeader showShadow={false}>
  <AppHeader title="My App" />
</StickyHeader>
```

### With Custom Styling

```tsx
<StickyHeader className="border-b-2 border-primary-500">
  <AppHeader title="My App" />
</StickyHeader>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | Required | Content to render inside the header |
| `showShadow` | `boolean` | `true` | Whether to show shadow when scrolled past 50px |
| `blurBackground` | `boolean` | `true` | Whether to apply backdrop blur effect |
| `className` | `string` | `undefined` | Additional CSS classes to apply |

## Implementation Details

### Fixed Positioning

The component uses `fixed top-0 left-0 right-0` classes to position the header at the top of the viewport. This ensures it remains visible during scrolling.

### Backdrop Blur

When `blurBackground` is true, the component applies:
- `bg-background/80`: Semi-transparent background
- `backdrop-blur-md`: Medium blur effect for glassmorphism

### Scroll Detection

The component uses Framer Motion's `useScroll` hook to track scroll position:
- Monitors `scrollY` value
- Sets `isScrolled` state when scroll exceeds 50px
- Applies shadow dynamically based on scroll state

### Z-Index Layering

The component uses `z-40` to ensure proper stacking:
- Above main content (typically z-0 to z-10)
- Below modals and dialogs (typically z-50+)
- Prevents content from appearing above the header

### Animation

The header animates in on mount:
- Initial state: `y: -100, opacity: 0` (above viewport, invisible)
- Animated state: `y: 0, opacity: 1` (normal position, visible)
- Duration: 300ms with easeOut easing

## Styling

The component uses Tailwind CSS classes and can be customized through:

1. **Props**: `blurBackground`, `showShadow`, `className`
2. **CSS Variables**: Inherits theme colors from CSS custom properties
3. **Tailwind Classes**: Additional classes via `className` prop

## Accessibility

- Uses semantic `<header>` element
- Maintains proper document structure
- Does not trap focus or interfere with keyboard navigation
- Shadow effect is purely visual and doesn't affect accessibility

## Browser Support

- Modern browsers with CSS backdrop-filter support
- Graceful degradation: blur effect may not work in older browsers
- Fixed positioning works in all modern browsers

## Performance

- Uses Framer Motion's optimized scroll tracking
- Shadow applied via inline styles (no layout recalculation)
- Minimal re-renders (only on scroll threshold crossing)
- Backdrop blur uses GPU acceleration

## Integration with AppShell

The StickyHeader is designed to work with the AppShell layout:

```tsx
import { AppShell } from './components/AppShell';
import { StickyHeader } from './components/StickyHeader';
import { AppHeader } from './components/AppHeader';

function App() {
  return (
    <AppShell
      header={
        <StickyHeader>
          <AppHeader title="Task Manager" />
        </StickyHeader>
      }
    >
      <main className="pt-16">
        {/* Content */}
      </main>
    </AppShell>
  );
}
```

## Requirements Mapping

- **Requirement 19.1**: Fixed positioning keeps header at top during scroll
- **Requirement 19.2**: Backdrop blur effect applied when `blurBackground={true}`
- **Requirement 19.3**: Shadow appears after scrolling past 50 pixels
- **Requirement 19.4**: Z-index layering ensures header doesn't obscure content

## Examples

See `StickyHeaderExample.tsx` for complete working examples:
- Basic usage with default settings
- Solid background without blur
- Custom styling with additional classes

## Testing

Unit tests are available in `__tests__/StickyHeader.test.tsx` covering:
- Rendering children correctly
- Fixed positioning classes
- Z-index layering
- Backdrop blur application
- Custom className support
- Border styling
- Semantic HTML structure

## Related Components

- **AppHeader**: Content component for the header
- **AppShell**: Layout wrapper that can contain StickyHeader
- **ThemeToggle**: Common action component used in headers
