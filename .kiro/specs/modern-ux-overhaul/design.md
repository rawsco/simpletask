# Design Document: Modern UX Overhaul

## Overview

This design document outlines the comprehensive modernization of the Task Manager frontend application. The overhaul transforms the basic UI into a polished, professional application with modern visual design, smooth animations, enhanced task management capabilities, improved accessibility, and mobile-first responsive design.

### Goals

- Implement a modern visual design system with light/dark themes and indigo/purple accent colors
- Integrate smooth animations and transitions using Framer Motion
- Enhance task management with inline editing, quick actions, bulk operations, categories, tags, and priorities
- Ensure excellent accessibility with WCAG 2.1 AA compliance, keyboard navigation, and screen reader support
- Deliver mobile-first responsive design with touch gesture support
- Implement PWA capabilities for offline support and installability
- Optimize performance with virtualized lists and lazy loading
- Provide comprehensive user feedback through toast notifications and loading states

### Technology Stack

- **Styling**: Tailwind CSS v3.4+ with custom theme configuration
- **Component Library**: Shadcn/ui (built on Radix UI primitives)
- **Animation**: Framer Motion v11+
- **State Management**: React Context API + hooks
- **Data Fetching**: Axios with optimistic updates
- **Virtualization**: @tanstack/react-virtual
- **PWA**: Vite PWA plugin with Workbox
- **Form Validation**: Zod for schema validation
- **Date Handling**: date-fns for date manipulation
- **Icons**: Lucide React for consistent iconography

## Architecture

### High-Level Architecture


```
┌─────────────────────────────────────────────────────────────┐
│                      Application Layer                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Pages      │  │  Routing     │  │  App Shell   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                     Component Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ UI Components│  │ Task Widgets │  │  Layouts     │      │
│  │  (Shadcn/ui) │  │              │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                      Service Layer                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  API Client  │  │ Theme System │  │ Notification │      │
│  │              │  │              │  │   System     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Storage     │  │ Animation    │  │ Validation   │      │
│  │  Manager     │  │  Engine      │  │   Engine     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                      Context Layer                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Auth Context │  │ Theme Context│  │ Task Context │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                    Infrastructure Layer                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Service      │  │ IndexedDB    │  │ Performance  │      │
│  │  Worker      │  │              │  │  Monitor     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### Architecture Principles

1. **Separation of Concerns**: Clear boundaries between presentation, business logic, and data access
2. **Component Composition**: Small, reusable components composed into larger features
3. **Progressive Enhancement**: Core functionality works without JavaScript, enhanced with modern features
4. **Performance First**: Lazy loading, code splitting, and virtualization for optimal performance
5. **Accessibility by Default**: WCAG 2.1 AA compliance built into all components
6. **Mobile First**: Design and implement for mobile, then enhance for larger screens

### Data Flow

```
User Action → Component → Context/Hook → Service → API Client → Backend
                ↓                                      ↓
         Optimistic Update                      Cache/Storage
                ↓                                      ↓
         UI Update (immediate)              Sync on Success/Revert on Error
```

## Components and Interfaces

### Core Component Structure


#### 1. Theme System Components

**ThemeProvider**
```typescript
interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: 'light' | 'dark' | 'system';
  storageKey?: string;
}

interface ThemeContextValue {
  theme: 'light' | 'dark';
  systemTheme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  highContrast: boolean;
  setHighContrast: (enabled: boolean) => void;
}
```

**ThemeToggle**
```typescript
interface ThemeToggleProps {
  variant?: 'icon' | 'switch' | 'dropdown';
  showLabel?: boolean;
}
```

#### 2. Task Management Components

**VirtualizedTaskList**
```typescript
interface VirtualizedTaskListProps {
  tasks: Task[];
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => Promise<void>;
  onTaskDelete: (taskId: string) => Promise<void>;
  onTaskReorder: (taskId: string, newPosition: number) => Promise<void>;
  filters: TaskFilters;
  sortBy: TaskSortOption;
  isLoading?: boolean;
}

interface Task {
  taskId: string;
  userId: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: 'critical' | 'high' | 'medium' | 'low';
  category?: string;
  tags: string[];
  dueDate?: string; // ISO 8601 format
  order: number;
  createdAt: number;
  updatedAt: number;
}

interface TaskFilters {
  status?: 'all' | 'active' | 'completed';
  priority?: Task['priority'][];
  category?: string;
  tags?: string[];
  dueDateRange?: { start?: string; end?: string };
  searchQuery?: string;
}

type TaskSortOption = 
  | 'order' 
  | 'priority' 
  | 'dueDate' 
  | 'createdAt' 
  | 'updatedAt' 
  | 'title';
```

**TaskItem**
```typescript
interface TaskItemProps {
  task: Task;
  onUpdate: (updates: Partial<Task>) => Promise<void>;
  onDelete: () => Promise<void>;
  isSelected?: boolean;
  onSelect?: (selected: boolean) => void;
  showQuickActions?: boolean;
}
```

**InlineTaskEditor**
```typescript
interface InlineTaskEditorProps {
  task: Task;
  field: 'title' | 'description';
  onSave: (value: string) => Promise<void>;
  onCancel: () => void;
  autoFocus?: boolean;
}
```

**QuickActionMenu**
```typescript
interface QuickActionMenuProps {
  task: Task;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onPriorityChange: (priority: Task['priority']) => void;
  position: 'hover' | 'swipe';
}
```

**BulkActionToolbar**
```typescript
interface BulkActionToolbarProps {
  selectedTasks: Task[];
  onClearSelection: () => void;
  onBulkDelete: () => Promise<void>;
  onBulkComplete: () => Promise<void>;
  onBulkPriorityChange: (priority: Task['priority']) => Promise<void>;
  onBulkCategoryChange: (category: string) => Promise<void>;
}
```

#### 3. Form Components

**TaskCreateForm**
```typescript
interface TaskCreateFormProps {
  onSubmit: (task: CreateTaskData) => Promise<void>;
  onCancel?: () => void;
  defaultValues?: Partial<CreateTaskData>;
}

interface CreateTaskData {
  title: string;
  description?: string;
  priority: Task['priority'];
  category?: string;
  tags: string[];
  dueDate?: string;
}
```

**FloatingLabelInput**
```typescript
interface FloatingLabelInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'email' | 'password' | 'tel' | 'url';
  error?: string;
  success?: boolean;
  required?: boolean;
  disabled?: boolean;
}
```

**DatePicker**
```typescript
interface DatePickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  minDate?: Date;
  maxDate?: Date;
  placeholder?: string;
  disabled?: boolean;
}
```

**CategorySelect**
```typescript
interface CategorySelectProps {
  value?: string;
  onChange: (category: string | undefined) => void;
  categories: Category[];
  allowCreate?: boolean;
  onCreateCategory?: (name: string) => Promise<Category>;
}

interface Category {
  id: string;
  name: string;
  color: string;
  icon?: string;
}
```

**TagInput**
```typescript
interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
  maxTags?: number;
  allowCreate?: boolean;
}
```

#### 4. Notification Components

**ToastProvider**
```typescript
interface ToastProviderProps {
  children: React.ReactNode;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  maxToasts?: number;
}

interface ToastContextValue {
  toast: (options: ToastOptions) => string;
  dismiss: (toastId: string) => void;
  dismissAll: () => void;
}

interface ToastOptions {
  title?: string;
  description: string;
  variant: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}
```

#### 5. Layout Components

**AppShell**
```typescript
interface AppShellProps {
  children: React.ReactNode;
  header: React.ReactNode;
  sidebar?: React.ReactNode;
  footer?: React.ReactNode;
}
```

**StickyHeader**
```typescript
interface StickyHeaderProps {
  children: React.ReactNode;
  showShadow?: boolean;
  blurBackground?: boolean;
}
```

**CollapsibleSidebar**
```typescript
interface CollapsibleSidebarProps {
  children: React.ReactNode;
  defaultCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  collapsedWidth?: number;
  expandedWidth?: number;
}
```

**BottomNavigation**
```typescript
interface BottomNavigationProps {
  items: NavigationItem[];
  activeItem: string;
  onItemChange: (itemId: string) => void;
}

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType;
  href: string;
  badge?: number;
}
```

#### 6. Feedback Components

**SkeletonLoader**
```typescript
interface SkeletonLoaderProps {
  variant: 'text' | 'circular' | 'rectangular' | 'task-item' | 'task-list';
  width?: string | number;
  height?: string | number;
  count?: number;
}
```

**ProgressIndicator**
```typescript
interface ProgressIndicatorProps {
  value?: number; // 0-100 for determinate, undefined for indeterminate
  size?: 'sm' | 'md' | 'lg';
  variant?: 'circular' | 'linear';
  label?: string;
}
```

**EmptyState**
```typescript
interface EmptyStateProps {
  illustration: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}
```

#### 7. Accessibility Components

**SkipNavigation**
```typescript
interface SkipNavigationProps {
  links: Array<{
    id: string;
    label: string;
  }>;
}
```

**KeyboardShortcutHandler**
```typescript
interface KeyboardShortcutHandlerProps {
  shortcuts: KeyboardShortcut[];
  enabled?: boolean;
}

interface KeyboardShortcut {
  key: string;
  modifiers?: ('ctrl' | 'shift' | 'alt' | 'meta')[];
  description: string;
  handler: () => void;
  preventDefault?: boolean;
}
```

**FocusTrap**
```typescript
interface FocusTrapProps {
  children: React.ReactNode;
  active: boolean;
  initialFocus?: React.RefObject<HTMLElement>;
  returnFocus?: boolean;
}
```

## Data Models

### Extended Task Model


The current Task model needs to be extended to support the new features:

```typescript
// Current model (from types/index.ts)
interface Task {
  userId: string;
  taskId: string;
  description: string;
  completed: boolean;
  order: number;
  createdAt: number;
  updatedAt: number;
}

// Extended model for modern UX
interface Task {
  // Existing fields
  userId: string;
  taskId: string;
  completed: boolean;
  order: number;
  createdAt: number;
  updatedAt: number;
  
  // Renamed/modified fields
  title: string; // Renamed from 'description' for clarity
  description?: string; // New optional detailed description
  
  // New fields
  priority: 'critical' | 'high' | 'medium' | 'low';
  category?: string; // Category ID reference
  tags: string[]; // Array of tag names
  dueDate?: string; // ISO 8601 date string
}
```

**Migration Strategy**: The backend API will need to support both old and new field names during a transition period. The frontend will map `description` to `title` for backward compatibility.

### Category Model

```typescript
interface Category {
  id: string;
  userId: string;
  name: string;
  color: string; // Hex color code
  icon?: string; // Icon name from Lucide React
  order: number;
  createdAt: number;
  updatedAt: number;
}
```

### User Preferences Model

```typescript
interface UserPreferences {
  userId: string;
  theme: 'light' | 'dark' | 'system';
  highContrast: boolean;
  reducedMotion: boolean;
  sidebarCollapsed: boolean;
  defaultTaskView: 'list' | 'board' | 'calendar';
  defaultTaskSort: TaskSortOption;
  defaultTaskFilters: TaskFilters;
  onboardingCompleted: boolean;
  dismissedTips: string[];
  keyboardShortcutsEnabled: boolean;
  notificationsEnabled: boolean;
  updatedAt: number;
}
```

### Toast Notification Model

```typescript
interface Toast {
  id: string;
  title?: string;
  description: string;
  variant: 'success' | 'error' | 'info' | 'warning';
  duration: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  createdAt: number;
}
```

### Undo Action Model

```typescript
interface UndoAction {
  id: string;
  type: 'delete' | 'bulk-delete' | 'status-change' | 'bulk-update';
  description: string;
  undo: () => Promise<void>;
  expiresAt: number;
}
```

### Performance Metrics Model

```typescript
interface PerformanceMetrics {
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  ttfb: number; // Time to First Byte
  fcp: number; // First Contentful Paint
  timestamp: number;
  url: string;
  userAgent: string;
}
```

## Theme System Design

### Color Palette

The theme system uses CSS custom properties for dynamic theming:

```css
/* Light Theme */
:root {
  /* Primary - Indigo/Purple gradient */
  --primary-50: #f5f3ff;
  --primary-100: #ede9fe;
  --primary-200: #ddd6fe;
  --primary-300: #c4b5fd;
  --primary-400: #a78bfa;
  --primary-500: #8b5cf6;
  --primary-600: #7c3aed;
  --primary-700: #6d28d9;
  --primary-800: #5b21b6;
  --primary-900: #4c1d95;
  
  /* Neutral */
  --neutral-50: #fafafa;
  --neutral-100: #f5f5f5;
  --neutral-200: #e5e5e5;
  --neutral-300: #d4d4d4;
  --neutral-400: #a3a3a3;
  --neutral-500: #737373;
  --neutral-600: #525252;
  --neutral-700: #404040;
  --neutral-800: #262626;
  --neutral-900: #171717;
  
  /* Semantic colors */
  --success: #10b981;
  --error: #ef4444;
  --warning: #f59e0b;
  --info: #3b82f6;
  
  /* Background */
  --background: #ffffff;
  --background-secondary: #f9fafb;
  --background-tertiary: #f3f4f6;
  
  /* Foreground */
  --foreground: #171717;
  --foreground-secondary: #525252;
  --foreground-tertiary: #a3a3a3;
  
  /* Border */
  --border: #e5e5e5;
  --border-hover: #d4d4d4;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1);
}

/* Dark Theme */
.dark {
  --primary-50: #4c1d95;
  --primary-100: #5b21b6;
  --primary-200: #6d28d9;
  --primary-300: #7c3aed;
  --primary-400: #8b5cf6;
  --primary-500: #a78bfa;
  --primary-600: #c4b5fd;
  --primary-700: #ddd6fe;
  --primary-800: #ede9fe;
  --primary-900: #f5f3ff;
  
  --background: #0a0a0a;
  --background-secondary: #171717;
  --background-tertiary: #262626;
  
  --foreground: #fafafa;
  --foreground-secondary: #a3a3a3;
  --foreground-tertiary: #525252;
  
  --border: #262626;
  --border-hover: #404040;
  
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.5);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.5);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.5);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.5);
}

/* High Contrast Mode */
.high-contrast {
  --primary-500: #6d28d9;
  --background: #ffffff;
  --foreground: #000000;
  --border: #000000;
  /* Remove gradients and increase contrast ratios */
}

.dark.high-contrast {
  --primary-500: #c4b5fd;
  --background: #000000;
  --foreground: #ffffff;
  --border: #ffffff;
}
```

### Tailwind Configuration

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: 'var(--primary-50)',
          100: 'var(--primary-100)',
          200: 'var(--primary-200)',
          300: 'var(--primary-300)',
          400: 'var(--primary-400)',
          500: 'var(--primary-500)',
          600: 'var(--primary-600)',
          700: 'var(--primary-700)',
          800: 'var(--primary-800)',
          900: 'var(--primary-900)',
        },
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        border: 'var(--border)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-primary': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'fade-in': 'fadeIn 200ms ease-in',
        'fade-out': 'fadeOut 200ms ease-out',
        'slide-in': 'slideIn 300ms ease-out',
        'slide-out': 'slideOut 300ms ease-in',
        'scale-in': 'scaleIn 200ms ease-out',
        'ripple': 'ripple 600ms ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        slideIn: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideOut: {
          '0%': { transform: 'translateY(0)', opacity: '1' },
          '100%': { transform: 'translateY(-10px)', opacity: '0' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        ripple: {
          '0%': { transform: 'scale(0)', opacity: '0.5' },
          '100%': { transform: 'scale(4)', opacity: '0' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('tailwindcss-animate'),
  ],
} satisfies Config;
```

## Animation System Design

### Framer Motion Configuration


All animations will respect the user's `prefers-reduced-motion` preference:

```typescript
// src/lib/motion.ts
import { Variants, Transition } from 'framer-motion';

// Check for reduced motion preference
export const prefersReducedMotion = () => {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

// Base transition configurations
export const transitions = {
  fast: { duration: 0.15, ease: 'easeOut' } as Transition,
  normal: { duration: 0.3, ease: 'easeInOut' } as Transition,
  slow: { duration: 0.5, ease: 'easeInOut' } as Transition,
  spring: { type: 'spring', stiffness: 300, damping: 30 } as Transition,
  springBouncy: { type: 'spring', stiffness: 400, damping: 20 } as Transition,
};

// Common animation variants
export const fadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: transitions.normal },
  exit: { opacity: 0, transition: transitions.fast },
};

export const slideUpVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: transitions.normal },
  exit: { opacity: 0, y: -20, transition: transitions.fast },
};

export const slideDownVariants: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: { opacity: 1, y: 0, transition: transitions.normal },
  exit: { opacity: 0, y: 20, transition: transitions.fast },
};

export const scaleVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: transitions.normal },
  exit: { opacity: 0, scale: 0.95, transition: transitions.fast },
};

export const listItemVariants: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.05,
      ...transitions.normal,
    },
  }),
  exit: { opacity: 0, x: 20, transition: transitions.fast },
};

// Task completion animation
export const taskCompleteVariants: Variants = {
  initial: { scale: 1 },
  complete: {
    scale: [1, 1.05, 1],
    transition: { duration: 0.3 },
  },
};

// Modal/Dialog animations
export const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: transitions.spring,
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 20,
    transition: transitions.fast,
  },
};

// Toast notification animations
export const toastVariants: Variants = {
  hidden: { opacity: 0, x: 100, scale: 0.8 },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: transitions.spring,
  },
  exit: {
    opacity: 0,
    x: 100,
    scale: 0.8,
    transition: transitions.fast,
  },
};

// Stagger children animation
export const staggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

// Gesture animations for drag
export const dragConstraints = {
  top: 0,
  bottom: 0,
  left: -100,
  right: 0,
};

// Helper to disable animations when reduced motion is preferred
export const getAnimationProps = (variants: Variants, custom?: any) => {
  if (prefersReducedMotion()) {
    return { initial: false, animate: 'visible', exit: false };
  }
  return {
    initial: 'hidden',
    animate: 'visible',
    exit: 'exit',
    variants,
    custom,
  };
};
```

### Animation Usage Examples

```typescript
// Task list with stagger animation
<motion.ul
  variants={staggerContainerVariants}
  initial="hidden"
  animate="visible"
>
  {tasks.map((task, i) => (
    <motion.li
      key={task.taskId}
      variants={listItemVariants}
      custom={i}
      layout
    >
      <TaskItem task={task} />
    </motion.li>
  ))}
</motion.ul>

// Modal with scale animation
<AnimatePresence>
  {isOpen && (
    <motion.div
      variants={modalVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <Dialog />
    </motion.div>
  )}
</AnimatePresence>

// Task completion animation
<motion.div
  variants={taskCompleteVariants}
  initial="initial"
  animate={task.completed ? 'complete' : 'initial'}
>
  <Checkbox checked={task.completed} />
</motion.div>
```

## Service Layer Design

### API Client Service

```typescript
// src/services/api-client.ts
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

class ApiClient {
  private client: AxiosInstance;
  private authToken: string | null = null;

  constructor(baseURL: string) {
    this.client = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        if (this.authToken) {
          config.headers.Authorization = `Bearer ${this.authToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Handle token refresh or logout
          this.handleUnauthorized();
        }
        return Promise.reject(error);
      }
    );
  }

  setAuthToken(token: string | null) {
    this.authToken = token;
  }

  private handleUnauthorized() {
    // Emit event for auth context to handle
    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.patch<T>(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }
}

export const apiClient = new ApiClient(import.meta.env.VITE_API_URL);
```

### Task Service

```typescript
// src/services/task-service.ts
import { apiClient } from './api-client';
import { Task, CreateTaskData, TaskFilters } from '../types';

export class TaskService {
  async getTasks(filters?: TaskFilters): Promise<Task[]> {
    const params = this.buildFilterParams(filters);
    return apiClient.get<Task[]>('/tasks', { params });
  }

  async getTask(taskId: string): Promise<Task> {
    return apiClient.get<Task>(`/tasks/${taskId}`);
  }

  async createTask(data: CreateTaskData): Promise<Task> {
    return apiClient.post<Task>('/tasks', data);
  }

  async updateTask(taskId: string, updates: Partial<Task>): Promise<Task> {
    return apiClient.patch<Task>(`/tasks/${taskId}`, updates);
  }

  async deleteTask(taskId: string): Promise<void> {
    return apiClient.delete<void>(`/tasks/${taskId}`);
  }

  async reorderTask(taskId: string, newPosition: number): Promise<void> {
    return apiClient.post<void>(`/tasks/${taskId}/reorder`, { newPosition });
  }

  async bulkUpdate(taskIds: string[], updates: Partial<Task>): Promise<Task[]> {
    return apiClient.post<Task[]>('/tasks/bulk-update', { taskIds, updates });
  }

  async bulkDelete(taskIds: string[]): Promise<void> {
    return apiClient.post<void>('/tasks/bulk-delete', { taskIds });
  }

  private buildFilterParams(filters?: TaskFilters): Record<string, any> {
    if (!filters) return {};
    
    const params: Record<string, any> = {};
    
    if (filters.status) params.status = filters.status;
    if (filters.priority) params.priority = filters.priority.join(',');
    if (filters.category) params.category = filters.category;
    if (filters.tags) params.tags = filters.tags.join(',');
    if (filters.searchQuery) params.q = filters.searchQuery;
    if (filters.dueDateRange?.start) params.dueDateStart = filters.dueDateRange.start;
    if (filters.dueDateRange?.end) params.dueDateEnd = filters.dueDateRange.end;
    
    return params;
  }
}

export const taskService = new TaskService();
```

### Storage Manager Service


```typescript
// src/services/storage-manager.ts
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Task, Category, UserPreferences } from '../types';

interface TaskManagerDB extends DBSchema {
  tasks: {
    key: string;
    value: Task;
    indexes: { 'by-user': string; 'by-category': string };
  };
  categories: {
    key: string;
    value: Category;
    indexes: { 'by-user': string };
  };
  preferences: {
    key: string;
    value: UserPreferences;
  };
  pendingSync: {
    key: string;
    value: {
      id: string;
      type: 'create' | 'update' | 'delete';
      resource: 'task' | 'category';
      data: any;
      timestamp: number;
    };
  };
}

class StorageManager {
  private db: IDBPDatabase<TaskManagerDB> | null = null;
  private readonly DB_NAME = 'task-manager-db';
  private readonly DB_VERSION = 1;

  async init(): Promise<void> {
    this.db = await openDB<TaskManagerDB>(this.DB_NAME, this.DB_VERSION, {
      upgrade(db) {
        // Tasks store
        const taskStore = db.createObjectStore('tasks', { keyPath: 'taskId' });
        taskStore.createIndex('by-user', 'userId');
        taskStore.createIndex('by-category', 'category');

        // Categories store
        const categoryStore = db.createObjectStore('categories', { keyPath: 'id' });
        categoryStore.createIndex('by-user', 'userId');

        // Preferences store
        db.createObjectStore('preferences', { keyPath: 'userId' });

        // Pending sync store
        db.createObjectStore('pendingSync', { keyPath: 'id' });
      },
    });
  }

  // Task operations
  async getTasks(userId: string): Promise<Task[]> {
    if (!this.db) await this.init();
    return this.db!.getAllFromIndex('tasks', 'by-user', userId);
  }

  async getTask(taskId: string): Promise<Task | undefined> {
    if (!this.db) await this.init();
    return this.db!.get('tasks', taskId);
  }

  async saveTask(task: Task): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.put('tasks', task);
  }

  async saveTasks(tasks: Task[]): Promise<void> {
    if (!this.db) await this.init();
    const tx = this.db!.transaction('tasks', 'readwrite');
    await Promise.all([
      ...tasks.map(task => tx.store.put(task)),
      tx.done,
    ]);
  }

  async deleteTask(taskId: string): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.delete('tasks', taskId);
  }

  // Category operations
  async getCategories(userId: string): Promise<Category[]> {
    if (!this.db) await this.init();
    return this.db!.getAllFromIndex('categories', 'by-user', userId);
  }

  async saveCategory(category: Category): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.put('categories', category);
  }

  async deleteCategory(categoryId: string): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.delete('categories', categoryId);
  }

  // Preferences operations
  async getPreferences(userId: string): Promise<UserPreferences | undefined> {
    if (!this.db) await this.init();
    return this.db!.get('preferences', userId);
  }

  async savePreferences(preferences: UserPreferences): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.put('preferences', preferences);
  }

  // Pending sync operations
  async addPendingSync(action: any): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.put('pendingSync', action);
  }

  async getPendingSync(): Promise<any[]> {
    if (!this.db) await this.init();
    return this.db!.getAll('pendingSync');
  }

  async clearPendingSync(id: string): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.delete('pendingSync', id);
  }

  // Clear all data
  async clearAll(): Promise<void> {
    if (!this.db) await this.init();
    const tx = this.db!.transaction(['tasks', 'categories', 'preferences', 'pendingSync'], 'readwrite');
    await Promise.all([
      tx.objectStore('tasks').clear(),
      tx.objectStore('categories').clear(),
      tx.objectStore('preferences').clear(),
      tx.objectStore('pendingSync').clear(),
      tx.done,
    ]);
  }
}

export const storageManager = new StorageManager();
```

### Notification Service

```typescript
// src/services/notification-service.ts
import { Toast, ToastOptions } from '../types';

type ToastListener = (toasts: Toast[]) => void;

class NotificationService {
  private toasts: Toast[] = [];
  private listeners: Set<ToastListener> = new Set();
  private nextId = 0;

  subscribe(listener: ToastListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(listener => listener([...this.toasts]));
  }

  toast(options: ToastOptions): string {
    const id = `toast-${this.nextId++}`;
    const toast: Toast = {
      id,
      title: options.title,
      description: options.description,
      variant: options.variant,
      duration: options.duration ?? 4000,
      action: options.action,
      createdAt: Date.now(),
    };

    this.toasts.push(toast);
    this.notify();

    // Auto-dismiss after duration
    if (toast.duration > 0) {
      setTimeout(() => this.dismiss(id), toast.duration);
    }

    return id;
  }

  dismiss(toastId: string) {
    this.toasts = this.toasts.filter(t => t.id !== toastId);
    this.notify();
  }

  dismissAll() {
    this.toasts = [];
    this.notify();
  }

  success(description: string, title?: string) {
    return this.toast({ variant: 'success', description, title });
  }

  error(description: string, title?: string) {
    return this.toast({ variant: 'error', description, title });
  }

  info(description: string, title?: string) {
    return this.toast({ variant: 'info', description, title });
  }

  warning(description: string, title?: string) {
    return this.toast({ variant: 'warning', description, title });
  }
}

export const notificationService = new NotificationService();
```

### Validation Service

```typescript
// src/services/validation-service.ts
import { z } from 'zod';

// Task validation schemas
export const taskTitleSchema = z
  .string()
  .min(1, 'Title is required')
  .max(200, 'Title must be less than 200 characters')
  .trim();

export const taskDescriptionSchema = z
  .string()
  .max(2000, 'Description must be less than 2000 characters')
  .optional();

export const taskPrioritySchema = z.enum(['critical', 'high', 'medium', 'low']);

export const taskCategorySchema = z.string().uuid().optional();

export const taskTagsSchema = z
  .array(z.string().min(1).max(50))
  .max(10, 'Maximum 10 tags allowed');

export const taskDueDateSchema = z
  .string()
  .datetime()
  .optional();

export const createTaskSchema = z.object({
  title: taskTitleSchema,
  description: taskDescriptionSchema,
  priority: taskPrioritySchema.default('medium'),
  category: taskCategorySchema,
  tags: taskTagsSchema.default([]),
  dueDate: taskDueDateSchema,
});

export const updateTaskSchema = createTaskSchema.partial();

// Category validation schemas
export const categoryNameSchema = z
  .string()
  .min(1, 'Category name is required')
  .max(50, 'Category name must be less than 50 characters')
  .trim();

export const categoryColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format');

export const createCategorySchema = z.object({
  name: categoryNameSchema,
  color: categoryColorSchema,
  icon: z.string().optional(),
});

// Password validation
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be less than 128 characters')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character');

// Email validation
export const emailSchema = z
  .string()
  .email('Invalid email address')
  .max(255, 'Email must be less than 255 characters');

// Password strength calculator
export function calculatePasswordStrength(password: string): {
  score: number; // 0-4
  label: 'weak' | 'fair' | 'good' | 'strong';
  feedback: string[];
} {
  let score = 0;
  const feedback: string[] = [];

  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  // Check for common patterns
  const commonPatterns = ['password', '123456', 'qwerty', 'abc123'];
  if (commonPatterns.some(pattern => password.toLowerCase().includes(pattern))) {
    score = Math.max(0, score - 2);
    feedback.push('Avoid common patterns');
  }

  if (password.length < 8) feedback.push('Use at least 8 characters');
  if (!/[a-z]/.test(password)) feedback.push('Add lowercase letters');
  if (!/[A-Z]/.test(password)) feedback.push('Add uppercase letters');
  if (!/[0-9]/.test(password)) feedback.push('Add numbers');
  if (!/[^a-zA-Z0-9]/.test(password)) feedback.push('Add special characters');

  const labels: Array<'weak' | 'fair' | 'good' | 'strong'> = ['weak', 'fair', 'good', 'strong'];
  const labelIndex = Math.min(Math.floor(score / 1.5), 3);

  return {
    score,
    label: labels[labelIndex],
    feedback,
  };
}
```

### Performance Monitor Service

```typescript
// src/services/performance-monitor.ts
import { PerformanceMetrics } from '../types';

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private observer: PerformanceObserver | null = null;

  init() {
    if (typeof window === 'undefined') return;

    // Observe Core Web Vitals
    this.observeLCP();
    this.observeFID();
    this.observeCLS();

    // Log navigation timing
    this.logNavigationTiming();
  }

  private observeLCP() {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1] as any;
      this.logMetric('LCP', lastEntry.renderTime || lastEntry.loadTime);
    });

    observer.observe({ entryTypes: ['largest-contentful-paint'] });
  }

  private observeFID() {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        this.logMetric('FID', entry.processingStart - entry.startTime);
      });
    });

    observer.observe({ entryTypes: ['first-input'] });
  }

  private observeCLS() {
    let clsValue = 0;
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as any[]) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      }
      this.logMetric('CLS', clsValue);
    });

    observer.observe({ entryTypes: ['layout-shift'] });
  }

  private logNavigationTiming() {
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      if (navigation) {
        this.logMetric('TTFB', navigation.responseStart - navigation.requestStart);
        this.logMetric('FCP', navigation.domContentLoadedEventEnd - navigation.fetchStart);
      }
    });
  }

  private logMetric(name: string, value: number) {
    if (import.meta.env.DEV) {
      console.log(`[Performance] ${name}:`, value.toFixed(2), 'ms');
    }

    // In production, send to analytics service
    if (import.meta.env.PROD) {
      // TODO: Send to analytics endpoint
    }
  }

  getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }
}

export const performanceMonitor = new PerformanceMonitor();
```

## Error Handling

### Error Types


```typescript
// src/types/errors.ts
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

export class NetworkError extends AppError {
  constructor(message: string, statusCode?: number) {
    super(message, 'NETWORK_ERROR', statusCode);
    this.name = 'NetworkError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 'AUTH_ERROR', 401);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Permission denied') {
    super(message, 'AUTHORIZATION_ERROR', 403);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409);
    this.name = 'ConflictError';
  }
}
```

### Error Boundary Component

```typescript
// src/components/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md w-full bg-background-secondary rounded-lg shadow-lg p-8 text-center"
          >
            <AlertTriangle className="w-16 h-16 text-error mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Something went wrong
            </h1>
            <p className="text-foreground-secondary mb-6">
              We're sorry for the inconvenience. Please try refreshing the page.
            </p>
            {import.meta.env.DEV && this.state.error && (
              <pre className="text-left text-xs bg-background p-4 rounded mb-4 overflow-auto">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### Global Error Handler

```typescript
// src/lib/error-handler.ts
import { AppError } from '../types/errors';
import { notificationService } from '../services/notification-service';

export function handleError(error: unknown): void {
  console.error('Error:', error);

  if (error instanceof AppError) {
    // Handle known application errors
    notificationService.error(error.message, getErrorTitle(error.code));
  } else if (error instanceof Error) {
    // Handle generic JavaScript errors
    notificationService.error(
      'An unexpected error occurred. Please try again.',
      'Error'
    );
  } else {
    // Handle unknown errors
    notificationService.error(
      'Something went wrong. Please try again.',
      'Error'
    );
  }
}

function getErrorTitle(code: string): string {
  const titles: Record<string, string> = {
    VALIDATION_ERROR: 'Validation Error',
    NETWORK_ERROR: 'Network Error',
    AUTH_ERROR: 'Authentication Error',
    AUTHORIZATION_ERROR: 'Permission Denied',
    NOT_FOUND: 'Not Found',
    CONFLICT: 'Conflict',
  };

  return titles[code] || 'Error';
}

// Axios error handler
export function handleApiError(error: any): never {
  if (error.response) {
    // Server responded with error status
    const { status, data } = error.response;
    throw new AppError(
      data.message || 'An error occurred',
      data.code || 'API_ERROR',
      status,
      data
    );
  } else if (error.request) {
    // Request made but no response
    throw new AppError(
      'Unable to reach the server. Please check your connection.',
      'NETWORK_ERROR'
    );
  } else {
    // Error setting up request
    throw new AppError(
      error.message || 'An unexpected error occurred',
      'UNKNOWN_ERROR'
    );
  }
}
```

## Testing Strategy

### Testing Approach

The modern UX overhaul will use a comprehensive testing strategy combining:

1. **Unit Tests**: Test individual components, hooks, and utility functions in isolation
2. **Integration Tests**: Test component interactions and data flow
3. **End-to-End Tests**: Test complete user workflows
4. **Visual Regression Tests**: Ensure UI consistency across changes
5. **Accessibility Tests**: Verify WCAG 2.1 AA compliance
6. **Performance Tests**: Validate Core Web Vitals targets

### Testing Tools

- **Unit/Integration**: Vitest + React Testing Library
- **E2E**: Playwright
- **Visual Regression**: Playwright with screenshot comparison
- **Accessibility**: axe-core + jest-axe
- **Performance**: Lighthouse CI

### Unit Testing Examples

```typescript
// src/components/__tests__/TaskItem.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TaskItem } from '../TaskItem';
import { Task } from '../../types';

describe('TaskItem', () => {
  const mockTask: Task = {
    taskId: '1',
    userId: 'user1',
    title: 'Test Task',
    completed: false,
    priority: 'medium',
    tags: [],
    order: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  it('renders task title', () => {
    render(<TaskItem task={mockTask} onUpdate={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('Test Task')).toBeInTheDocument();
  });

  it('calls onUpdate when checkbox is clicked', async () => {
    const onUpdate = vi.fn();
    render(<TaskItem task={mockTask} onUpdate={onUpdate} onDelete={vi.fn()} />);
    
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    
    expect(onUpdate).toHaveBeenCalledWith({ completed: true });
  });

  it('shows quick actions on hover', async () => {
    render(
      <TaskItem 
        task={mockTask} 
        onUpdate={vi.fn()} 
        onDelete={vi.fn()} 
        showQuickActions 
      />
    );
    
    const taskElement = screen.getByTestId('task-item');
    fireEvent.mouseEnter(taskElement);
    
    expect(screen.getByLabelText('Edit task')).toBeInTheDocument();
    expect(screen.getByLabelText('Delete task')).toBeInTheDocument();
  });

  it('applies correct priority styling', () => {
    const criticalTask = { ...mockTask, priority: 'critical' as const };
    const { container } = render(
      <TaskItem task={criticalTask} onUpdate={vi.fn()} onDelete={vi.fn()} />
    );
    
    expect(container.querySelector('.priority-critical')).toBeInTheDocument();
  });
});
```

### Integration Testing Examples

```typescript
// src/features/__tests__/TaskManagement.integration.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TasksPage } from '../../pages/TasksPage';
import { setupMockServer } from '../test-utils/mock-server';

describe('Task Management Integration', () => {
  const server = setupMockServer();

  beforeEach(() => {
    server.resetHandlers();
  });

  it('creates a new task and displays it in the list', async () => {
    const user = userEvent.setup();
    render(<TasksPage />);

    // Open create form
    await user.click(screen.getByRole('button', { name: /new task/i }));

    // Fill form
    await user.type(screen.getByLabelText(/title/i), 'New Task');
    await user.selectOptions(screen.getByLabelText(/priority/i), 'high');
    await user.click(screen.getByRole('button', { name: /create/i }));

    // Verify task appears in list
    await waitFor(() => {
      expect(screen.getByText('New Task')).toBeInTheDocument();
    });
  });

  it('filters tasks by priority', async () => {
    const user = userEvent.setup();
    render(<TasksPage />);

    // Wait for tasks to load
    await waitFor(() => {
      expect(screen.getByText('High Priority Task')).toBeInTheDocument();
    });

    // Apply filter
    await user.click(screen.getByRole('button', { name: /filter/i }));
    await user.click(screen.getByRole('checkbox', { name: /high/i }));

    // Verify only high priority tasks are shown
    expect(screen.getByText('High Priority Task')).toBeInTheDocument();
    expect(screen.queryByText('Low Priority Task')).not.toBeInTheDocument();
  });

  it('performs bulk delete operation', async () => {
    const user = userEvent.setup();
    render(<TasksPage />);

    await waitFor(() => {
      expect(screen.getAllByRole('checkbox')).toHaveLength(3);
    });

    // Select multiple tasks
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[0]);
    await user.click(checkboxes[1]);

    // Delete selected
    await user.click(screen.getByRole('button', { name: /delete selected/i }));
    await user.click(screen.getByRole('button', { name: /confirm/i }));

    // Verify tasks are removed
    await waitFor(() => {
      expect(screen.getAllByRole('checkbox')).toHaveLength(1);
    });
  });
});
```

### Accessibility Testing

```typescript
// src/components/__tests__/TaskItem.a11y.test.tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { TaskItem } from '../TaskItem';

expect.extend(toHaveNoViolations);

describe('TaskItem Accessibility', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(
      <TaskItem 
        task={mockTask} 
        onUpdate={vi.fn()} 
        onDelete={vi.fn()} 
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has proper ARIA labels', () => {
    render(<TaskItem task={mockTask} onUpdate={vi.fn()} onDelete={vi.fn()} />);
    
    expect(screen.getByRole('checkbox')).toHaveAccessibleName('Mark task as complete');
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
  });

  it('supports keyboard navigation', async () => {
    const user = userEvent.setup();
    render(<TaskItem task={mockTask} onUpdate={vi.fn()} onDelete={vi.fn()} />);
    
    // Tab to checkbox
    await user.tab();
    expect(screen.getByRole('checkbox')).toHaveFocus();
    
    // Tab to edit button
    await user.tab();
    expect(screen.getByRole('button', { name: /edit/i })).toHaveFocus();
  });
});
```

### E2E Testing Examples

```typescript
// e2e/task-management.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Task Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Login' }).click();
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page).toHaveURL('/tasks');
  });

  test('creates and completes a task', async ({ page }) => {
    // Create task
    await page.getByRole('button', { name: 'New Task' }).click();
    await page.getByLabel('Title').fill('Buy groceries');
    await page.getByLabel('Priority').selectOption('high');
    await page.getByRole('button', { name: 'Create' }).click();

    // Verify task appears
    await expect(page.getByText('Buy groceries')).toBeVisible();

    // Complete task
    await page.getByRole('checkbox', { name: 'Mark task as complete' }).click();
    await expect(page.getByText('Buy groceries')).toHaveClass(/line-through/);

    // Verify success toast
    await expect(page.getByText('Task completed')).toBeVisible();
  });

  test('filters tasks by category', async ({ page }) => {
    // Apply category filter
    await page.getByRole('button', { name: 'Filter' }).click();
    await page.getByRole('combobox', { name: 'Category' }).selectOption('Work');

    // Verify only work tasks are shown
    await expect(page.getByText('Work Task 1')).toBeVisible();
    await expect(page.getByText('Personal Task 1')).not.toBeVisible();
  });

  test('uses keyboard shortcuts', async ({ page }) => {
    // Open new task form with Ctrl+N
    await page.keyboard.press('Control+N');
    await expect(page.getByLabel('Title')).toBeFocused();

    // Close with Escape
    await page.keyboard.press('Escape');
    await expect(page.getByLabel('Title')).not.toBeVisible();

    // Open search with Ctrl+F
    await page.keyboard.press('Control+F');
    await expect(page.getByPlaceholder('Search tasks')).toBeFocused();
  });
});
```

### Performance Testing

```typescript
// e2e/performance.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Performance', () => {
  test('meets Core Web Vitals targets', async ({ page }) => {
    await page.goto('/tasks');

    // Measure LCP
    const lcp = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as any;
          resolve(lastEntry.renderTime || lastEntry.loadTime);
        }).observe({ entryTypes: ['largest-contentful-paint'] });
      });
    });

    expect(lcp).toBeLessThan(2500); // LCP < 2.5s

    // Measure CLS
    const cls = await page.evaluate(() => {
      return new Promise((resolve) => {
        let clsValue = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as any[]) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          }
          setTimeout(() => resolve(clsValue), 5000);
        }).observe({ entryTypes: ['layout-shift'] });
      });
    });

    expect(cls).toBeLessThan(0.1); // CLS < 0.1
  });

  test('handles large task lists efficiently', async ({ page }) => {
    // Create 1000 tasks
    await page.goto('/tasks?mock=1000');

    // Measure scroll performance
    const startTime = Date.now();
    await page.mouse.wheel(0, 10000);
    await page.waitForTimeout(100);
    const endTime = Date.now();

    expect(endTime - startTime).toBeLessThan(500); // Smooth scrolling
  });
});
```

## PWA Implementation

### Service Worker Configuration


```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'Task Manager',
        short_name: 'Tasks',
        description: 'Modern task management application',
        theme_color: '#8b5cf6',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.taskmanager\.com\/.*$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
        ],
      },
    }),
  ],
});
```

### Offline Sync Manager

```typescript
// src/services/offline-sync-manager.ts
import { storageManager } from './storage-manager';
import { taskService } from './task-service';
import { notificationService } from './notification-service';

class OfflineSyncManager {
  private syncInProgress = false;
  private syncQueue: Array<() => Promise<void>> = [];

  constructor() {
    this.setupOnlineListener();
  }

  private setupOnlineListener() {
    window.addEventListener('online', () => {
      this.syncPendingChanges();
    });

    window.addEventListener('offline', () => {
      notificationService.info('You are offline. Changes will sync when you reconnect.');
    });
  }

  async syncPendingChanges(): Promise<void> {
    if (this.syncInProgress) return;

    this.syncInProgress = true;
    const pendingActions = await storageManager.getPendingSync();

    if (pendingActions.length === 0) {
      this.syncInProgress = false;
      return;
    }

    notificationService.info(`Syncing ${pendingActions.length} pending changes...`);

    for (const action of pendingActions) {
      try {
        await this.syncAction(action);
        await storageManager.clearPendingSync(action.id);
      } catch (error) {
        console.error('Failed to sync action:', action, error);
        // Keep in queue for next sync attempt
      }
    }

    this.syncInProgress = false;
    notificationService.success('All changes synced successfully');
  }

  private async syncAction(action: any): Promise<void> {
    switch (action.type) {
      case 'create':
        if (action.resource === 'task') {
          await taskService.createTask(action.data);
        }
        break;
      case 'update':
        if (action.resource === 'task') {
          await taskService.updateTask(action.data.taskId, action.data);
        }
        break;
      case 'delete':
        if (action.resource === 'task') {
          await taskService.deleteTask(action.data.taskId);
        }
        break;
    }
  }

  async queueAction(action: any): Promise<void> {
    await storageManager.addPendingSync({
      ...action,
      id: `${action.type}-${action.resource}-${Date.now()}`,
      timestamp: Date.now(),
    });

    if (navigator.onLine) {
      this.syncPendingChanges();
    }
  }

  isOnline(): boolean {
    return navigator.onLine;
  }
}

export const offlineSyncManager = new OfflineSyncManager();
```

### Install Prompt Handler

```typescript
// src/hooks/useInstallPrompt.ts
import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function useInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = async () => {
    if (!installPrompt) return false;

    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;

    if (outcome === 'accepted') {
      setInstallPrompt(null);
      return true;
    }

    return false;
  };

  return {
    canInstall: !!installPrompt && !isInstalled,
    isInstalled,
    promptInstall,
  };
}
```

## Responsive Design Strategy

### Breakpoint System

```typescript
// src/lib/breakpoints.ts
export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export type Breakpoint = keyof typeof breakpoints;

// Media query hooks
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);

    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    media.addEventListener('change', listener);

    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
}

export function useBreakpoint(breakpoint: Breakpoint): boolean {
  return useMediaQuery(`(min-width: ${breakpoints[breakpoint]}px)`);
}

export function useIsMobile(): boolean {
  return !useBreakpoint('md');
}

export function useIsTablet(): boolean {
  const isMd = useBreakpoint('md');
  const isLg = useBreakpoint('lg');
  return isMd && !isLg;
}

export function useIsDesktop(): boolean {
  return useBreakpoint('lg');
}
```

### Responsive Layout Components

```typescript
// src/components/ResponsiveLayout.tsx
import { useIsMobile, useIsTablet } from '../lib/breakpoints';

export function ResponsiveLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile: Bottom navigation */}
      {isMobile && (
        <>
          <main className="pb-16">{children}</main>
          <BottomNavigation />
        </>
      )}

      {/* Tablet: Collapsible sidebar */}
      {isTablet && (
        <div className="flex">
          <CollapsibleSidebar defaultCollapsed />
          <main className="flex-1">{children}</main>
        </div>
      )}

      {/* Desktop: Full sidebar */}
      {!isMobile && !isTablet && (
        <div className="flex">
          <CollapsibleSidebar />
          <main className="flex-1">{children}</main>
        </div>
      )}
    </div>
  );
}
```

### Touch Gesture Support

```typescript
// src/hooks/useSwipeGesture.ts
import { useRef, useEffect } from 'react';

interface SwipeGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
}

export function useSwipeGesture(options: SwipeGestureOptions) {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    threshold = 50,
  } = options;

  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const touchEnd = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: TouchEvent) => {
    touchEnd.current = null;
    touchStart.current = {
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    };
  };

  const handleTouchMove = (e: TouchEvent) => {
    touchEnd.current = {
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    };
  };

  const handleTouchEnd = () => {
    if (!touchStart.current || !touchEnd.current) return;

    const deltaX = touchStart.current.x - touchEnd.current.x;
    const deltaY = touchStart.current.y - touchEnd.current.y;

    const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY);

    if (isHorizontalSwipe) {
      if (Math.abs(deltaX) > threshold) {
        if (deltaX > 0) {
          onSwipeLeft?.();
        } else {
          onSwipeRight?.();
        }
      }
    } else {
      if (Math.abs(deltaY) > threshold) {
        if (deltaY > 0) {
          onSwipeUp?.();
        } else {
          onSwipeDown?.();
        }
      }
    }
  };

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };
}
```

## Implementation Phases

### Phase 1: Foundation (Week 1-2)

1. Set up Tailwind CSS with custom theme configuration
2. Install and configure Shadcn/ui components
3. Install and configure Framer Motion
4. Implement theme system (light/dark mode)
5. Create base layout components (AppShell, Header, Sidebar)
6. Set up error boundaries and global error handling

### Phase 2: Core Components (Week 3-4)

1. Implement form components with floating labels
2. Create toast notification system
3. Build skeleton loaders and loading states
4. Implement modal/dialog components
5. Create button, input, and select components
6. Add ripple effects and hover animations

### Phase 3: Task Management (Week 5-6)

1. Extend Task data model with new fields
2. Implement virtualized task list
3. Create inline task editor
4. Build quick action menu
5. Implement bulk action toolbar
6. Add task filters and sorting

### Phase 4: Enhanced Features (Week 7-8)

1. Implement category and tag management
2. Create date picker component
3. Add priority indicators and styling
4. Build empty states with illustrations
5. Implement onboarding tips system
6. Add keyboard shortcuts

### Phase 5: Accessibility & PWA (Week 9-10)

1. Implement keyboard navigation
2. Add ARIA labels and live regions
3. Create focus management system
4. Implement high contrast mode
5. Set up service worker and PWA manifest
6. Implement offline sync manager

### Phase 6: Performance & Polish (Week 11-12)

1. Implement lazy loading for routes
2. Add performance monitoring
3. Optimize animations for 60fps
4. Implement pull-to-refresh
5. Add optimistic UI updates
6. Conduct accessibility audit
7. Run performance tests
8. Fix bugs and polish UI

## Migration Strategy

### Backend API Changes

The backend needs to support the extended Task model. Migration approach:

1. **Phase 1**: Add new fields to DynamoDB table schema
   - Add `title`, `priority`, `category`, `tags`, `dueDate` fields
   - Keep `description` field for backward compatibility

2. **Phase 2**: Update Lambda handlers to accept both old and new formats
   - Map `description` to `title` if `title` is not provided
   - Provide default values for new fields

3. **Phase 3**: Update frontend to use new field names
   - Send both `title` and `description` during transition
   - Handle responses with either field name

4. **Phase 4**: Deprecate old field names
   - Remove `description` field mapping after all clients updated

### Data Migration Script

```typescript
// scripts/migrate-tasks.ts
import { DynamoDB } from 'aws-sdk';

const dynamodb = new DynamoDB.DocumentClient();
const TABLE_NAME = 'TaskManagerTable';

async function migrateTasks() {
  let lastKey: any = undefined;
  let migratedCount = 0;

  do {
    const result = await dynamodb.scan({
      TableName: TABLE_NAME,
      ExclusiveStartKey: lastKey,
    }).promise();

    const tasks = result.Items || [];

    for (const task of tasks) {
      if (!task.title && task.description) {
        // Migrate old format to new format
        await dynamodb.update({
          TableName: TABLE_NAME,
          Key: { userId: task.userId, taskId: task.taskId },
          UpdateExpression: 'SET title = :title, priority = :priority, tags = :tags',
          ExpressionAttributeValues: {
            ':title': task.description,
            ':priority': 'medium',
            ':tags': [],
          },
        }).promise();

        migratedCount++;
      }
    }

    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  console.log(`Migrated ${migratedCount} tasks`);
}

migrateTasks().catch(console.error);
```

## Deployment Considerations

### Build Configuration

```json
// package.json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:e2e": "playwright test",
    "test:coverage": "vitest --coverage",
    "lint": "eslint src --ext ts,tsx",
    "format": "prettier --write src/**/*.{ts,tsx}",
    "lighthouse": "lighthouse-ci autorun"
  }
}
```

### Environment Variables

```bash
# .env.production
VITE_API_URL=https://api.taskmanager.com
VITE_ENABLE_PWA=true
VITE_ENABLE_ANALYTICS=true
VITE_SENTRY_DSN=https://...
```

### CDN and Caching

- Static assets (JS, CSS, images) cached for 1 year with content hashing
- HTML files cached for 5 minutes with revalidation
- API responses cached based on Cache-Control headers
- Service worker handles offline caching

### Performance Targets

- Lighthouse Performance Score: > 90
- First Contentful Paint (FCP): < 1.5s
- Largest Contentful Paint (LCP): < 2.5s
- First Input Delay (FID): < 100ms
- Cumulative Layout Shift (CLS): < 0.1
- Time to Interactive (TTI): < 3.5s

## Security Considerations

### Content Security Policy

```typescript
// vite.config.ts - Add CSP headers
export default defineConfig({
  server: {
    headers: {
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: https:",
        "connect-src 'self' https://api.taskmanager.com",
      ].join('; '),
    },
  },
});
```

### XSS Prevention

- All user input sanitized before rendering
- Use React's built-in XSS protection (JSX escaping)
- Validate and sanitize data from API responses
- Use DOMPurify for rich text content

### Authentication

- Store auth tokens in httpOnly cookies (not localStorage)
- Implement token refresh mechanism
- Clear sensitive data on logout
- Implement CSRF protection

## Monitoring and Analytics

### Error Tracking

```typescript
// src/lib/error-tracking.ts
import * as Sentry from '@sentry/react';

if (import.meta.env.PROD) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
    integrations: [
      new Sentry.BrowserTracing(),
      new Sentry.Replay(),
    ],
  });
}
```

### Analytics

```typescript
// src/lib/analytics.ts
export function trackEvent(event: string, properties?: Record<string, any>) {
  if (import.meta.env.PROD && window.gtag) {
    window.gtag('event', event, properties);
  }
}

export function trackPageView(path: string) {
  if (import.meta.env.PROD && window.gtag) {
    window.gtag('config', 'GA_MEASUREMENT_ID', {
      page_path: path,
    });
  }
}
```

## Documentation Requirements

### Component Documentation

Each component should include:
- Purpose and usage description
- Props interface with descriptions
- Usage examples
- Accessibility notes
- Performance considerations

### Storybook Integration

```typescript
// src/components/Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Click me',
  },
};

export const WithIcon: Story = {
  args: {
    variant: 'primary',
    children: 'Save',
    icon: <Save className="w-4 h-4" />,
  },
};
```

## Conclusion

This design document provides a comprehensive blueprint for modernizing the Task Manager frontend application. The implementation leverages industry-standard tools (Tailwind CSS, Shadcn/ui, Framer Motion) to deliver a premium user experience with excellent performance, accessibility, and mobile support.

Key design decisions:
- Mobile-first responsive design ensures great UX on all devices
- Component-based architecture promotes reusability and maintainability
- Progressive Web App capabilities enable offline usage and installation
- Comprehensive testing strategy ensures quality and reliability
- Performance optimization techniques meet Core Web Vitals targets
- Accessibility features ensure WCAG 2.1 AA compliance

The phased implementation approach allows for incremental delivery while maintaining a working application throughout the development process.
