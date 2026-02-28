# CollapsibleSidebar Component

## Quick Start

```tsx
import { CollapsibleSidebar } from './components/CollapsibleSidebar';

function App() {
  return (
    <div className="flex">
      <CollapsibleSidebar>
        {/* Your sidebar content */}
      </CollapsibleSidebar>
      <main className="flex-1">
        {/* Main content */}
      </main>
    </div>
  );
}
```

## Features

✅ Smooth 300ms expand/collapse animation  
✅ Icon-only collapsed state (64px width)  
✅ Persistent state via localStorage  
✅ Auto-collapse on screens <1024px  
✅ Keyboard accessible  
✅ Respects reduced motion preferences  
✅ Customizable widths  

## Requirements Implemented

- **22.1**: Toggle expand/collapse functionality
- **22.2**: 300ms animation with smooth transitions
- **22.3**: Icon-only collapsed state
- **22.4**: localStorage persistence
- **22.5**: Responsive breakpoints (<1024px)

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | required | Sidebar content |
| `defaultCollapsed` | `boolean` | `false` | Initial collapsed state |
| `onCollapsedChange` | `(collapsed: boolean) => void` | - | Callback when state changes |
| `collapsedWidth` | `number` | `64` | Width in pixels when collapsed |
| `expandedWidth` | `number` | `256` | Width in pixels when expanded |

## Files

- `CollapsibleSidebar.tsx` - Main component
- `CollapsibleSidebar.md` - Detailed documentation
- `CollapsibleSidebarExample.tsx` - Usage example
- `__tests__/CollapsibleSidebar.test.tsx` - Unit tests
- `__tests__/CollapsibleSidebar.manual-test.md` - Manual test guide

## Testing

### Unit Tests
```bash
npm test CollapsibleSidebar.test.tsx
```

### Manual Testing
See `__tests__/CollapsibleSidebar.manual-test.md` for comprehensive test cases.

## Integration with AppShell

```tsx
import { AppShell } from './components/AppShell';
import { CollapsibleSidebar } from './components/CollapsibleSidebar';
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

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Accessibility

- ✅ ARIA labels and attributes
- ✅ Keyboard navigation (Tab, Enter, Space)
- ✅ Focus management
- ✅ Screen reader support
- ✅ Reduced motion support

## Performance

- Smooth 60fps animations
- Efficient re-renders with React state
- No layout thrashing
- Optimized for mobile devices

## Dependencies

- `react` - UI framework
- `framer-motion` - Animation library
- `lucide-react` - Icons
- `tailwindcss` - Styling

## License

Part of the Task Manager Modern UX Overhaul project.
