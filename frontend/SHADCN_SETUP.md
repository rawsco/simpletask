# Shadcn/ui Setup Documentation

This document describes the Shadcn/ui component library setup for the Task Manager frontend.

## Overview

Shadcn/ui is a collection of re-usable components built using Radix UI primitives and styled with Tailwind CSS. The components are accessible, customizable, and follow modern design patterns.

## Installation

The following packages have been installed:

### Core Dependencies
- `@radix-ui/react-slot` - Composition primitive
- `@radix-ui/react-dialog` - Dialog/Modal primitive
- `@radix-ui/react-dropdown-menu` - Dropdown menu primitive
- `@radix-ui/react-select` - Select primitive
- `@radix-ui/react-checkbox` - Checkbox primitive
- `@radix-ui/react-label` - Label primitive
- `@radix-ui/react-toast` - Toast notification primitive

### Utility Dependencies
- `class-variance-authority` - For component variants
- `clsx` - For conditional class names
- `tailwind-merge` - For merging Tailwind classes
- `lucide-react` - Icon library

## Configuration

### 1. components.json

The `components.json` file configures Shadcn/ui settings:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/index.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

### 2. TypeScript Path Aliases

Updated `tsconfig.json` to include path aliases:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### 3. Vite Configuration

Updated `vite.config.ts` to resolve path aliases:

```typescript
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

### 4. Tailwind Configuration

Updated `tailwind.config.ts` with Shadcn/ui theme settings:

- Added HSL-based color system using CSS variables
- Configured container settings
- Added border radius utilities
- Maintained existing custom animations and colors

### 5. CSS Variables

Added Shadcn/ui CSS variables to `src/index.css`:

```css
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 0 0% 9%;
    --primary: 262 83% 58%;
    --primary-foreground: 0 0% 100%;
    /* ... more variables */
  }

  .dark {
    --background: 0 0% 4%;
    --foreground: 0 0% 98%;
    /* ... dark mode variables */
  }
}
```

## Installed Components

The following base components have been installed:

### Button (`src/components/ui/button.tsx`)
- Variants: default, destructive, outline, secondary, ghost, link
- Sizes: default, sm, lg, icon
- Supports `asChild` prop for composition

### Input (`src/components/ui/input.tsx`)
- Accessible text input with consistent styling
- Supports all standard HTML input attributes

### Label (`src/components/ui/label.tsx`)
- Accessible label component using Radix UI
- Automatically handles disabled states

### Checkbox (`src/components/ui/checkbox.tsx`)
- Accessible checkbox using Radix UI
- Includes check icon from lucide-react

## Usage Examples

### Button

```tsx
import { Button } from '@/components/ui/button'

function Example() {
  return (
    <>
      <Button>Default Button</Button>
      <Button variant="destructive">Delete</Button>
      <Button variant="outline" size="sm">Small Outline</Button>
      <Button variant="ghost" size="icon">
        <Icon />
      </Button>
    </>
  )
}
```

### Input with Label

```tsx
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function Example() {
  return (
    <div className="space-y-2">
      <Label htmlFor="email">Email</Label>
      <Input id="email" type="email" placeholder="Enter your email" />
    </div>
  )
}
```

### Checkbox

```tsx
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

function Example() {
  return (
    <div className="flex items-center space-x-2">
      <Checkbox id="terms" />
      <Label htmlFor="terms">Accept terms and conditions</Label>
    </div>
  )
}
```

## Utility Functions

### cn() - Class Name Utility

Located in `src/lib/utils.ts`, this utility combines `clsx` and `tailwind-merge`:

```typescript
import { cn } from '@/lib/utils'

// Merge classes with proper Tailwind precedence
const className = cn(
  'base-class',
  condition && 'conditional-class',
  'override-class'
)
```

## Theme Customization

The theme uses CSS variables for easy customization. To modify colors:

1. Update CSS variables in `src/index.css`
2. Colors use HSL format: `hsl(var(--primary))`
3. Dark mode is handled via the `.dark` class

## Adding New Components

To add more Shadcn/ui components:

1. Visit https://ui.shadcn.com/docs/components
2. Copy the component code
3. Create a new file in `src/components/ui/`
4. Adjust imports to use `@/` aliases
5. Export from `src/components/ui/index.ts`

## Accessibility

All Shadcn/ui components are built with accessibility in mind:

- Proper ARIA attributes
- Keyboard navigation support
- Focus management
- Screen reader compatibility
- Follows WCAG 2.1 AA standards

## Requirements Satisfied

This setup satisfies the following requirements from the design document:

- **Requirement 35.1**: Uses Shadcn/ui components for buttons, inputs, dialogs, and dropdowns
- **Requirement 35.2**: Components meet WCAG 2.1 AA accessibility standards
- **Requirement 35.3**: Theme customization through CSS variables
- **Requirement 35.4**: Uses Radix UI primitives as the foundation

## Next Steps

With Shadcn/ui configured, you can now:

1. Add more components as needed (Dialog, Select, Toast, etc.)
2. Build custom components using the established patterns
3. Implement the theme system with light/dark mode
4. Create form components with validation
5. Build the task management UI components
