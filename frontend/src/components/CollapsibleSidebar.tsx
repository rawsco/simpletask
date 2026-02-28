import { ReactNode, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { transitions, prefersReducedMotion } from '../lib/motion';

interface CollapsibleSidebarProps {
  children: ReactNode;
  defaultCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  collapsedWidth?: number;
  expandedWidth?: number;
}

const STORAGE_KEY = 'sidebar-collapsed';

/**
 * CollapsibleSidebar - Animated sidebar with expand/collapse functionality
 * 
 * Features:
 * - Smooth expand/collapse animation (300ms)
 * - Icon-only collapsed state
 * - Persists state to localStorage
 * - Responsive breakpoints (auto-collapse on <1024px)
 * - Respects reduced motion preferences
 * 
 * Requirements: 22.1, 22.2, 22.3, 22.4, 22.5
 */
export function CollapsibleSidebar({
  children,
  defaultCollapsed = false,
  onCollapsedChange,
  collapsedWidth = 64,
  expandedWidth = 256,
}: CollapsibleSidebarProps) {
  // Load initial state from localStorage or use default
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load sidebar state from localStorage:', error);
    }
    return defaultCollapsed;
  });

  // Handle responsive breakpoints - auto-collapse on <1024px
  useEffect(() => {
    const handleResize = () => {
      const isSmallScreen = window.innerWidth < 1024;
      if (isSmallScreen && !isCollapsed) {
        handleToggle(true);
      }
    };

    // Check on mount
    handleResize();

    // Listen for resize events
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Persist state to localStorage
  const handleToggle = (collapsed?: boolean) => {
    const newState = collapsed !== undefined ? collapsed : !isCollapsed;
    setIsCollapsed(newState);
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
    } catch (error) {
      console.error('Failed to save sidebar state to localStorage:', error);
    }

    onCollapsedChange?.(newState);
  };

  // Animation configuration
  const sidebarVariants = {
    expanded: {
      width: expandedWidth,
      transition: prefersReducedMotion() 
        ? { duration: 0 } 
        : { ...transitions.normal, duration: 0.3 },
    },
    collapsed: {
      width: collapsedWidth,
      transition: prefersReducedMotion() 
        ? { duration: 0 } 
        : { ...transitions.normal, duration: 0.3 },
    },
  };

  const contentVariants = {
    expanded: {
      opacity: 1,
      transition: prefersReducedMotion() 
        ? { duration: 0 } 
        : { ...transitions.fast, delay: 0.1 },
    },
    collapsed: {
      opacity: 0,
      transition: prefersReducedMotion() 
        ? { duration: 0 } 
        : transitions.fast,
    },
  };

  return (
    <motion.aside
      initial={false}
      animate={isCollapsed ? 'collapsed' : 'expanded'}
      variants={sidebarVariants}
      className="relative border-r border-border bg-background-secondary flex-shrink-0 overflow-hidden"
    >
      {/* Toggle button */}
      <button
        onClick={() => handleToggle()}
        className="absolute top-4 right-2 z-10 p-2 rounded-lg bg-background hover:bg-background-tertiary transition-colors border border-border shadow-sm"
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-expanded={!isCollapsed}
      >
        {isCollapsed ? (
          <ChevronRight className="w-4 h-4 text-foreground" />
        ) : (
          <ChevronLeft className="w-4 h-4 text-foreground" />
        )}
      </button>

      {/* Sidebar content */}
      <div className="h-full overflow-y-auto pt-16 pb-4">
        <AnimatePresence mode="wait">
          {isCollapsed ? (
            // Icon-only collapsed state
            <motion.div
              key="collapsed"
              initial="collapsed"
              animate="expanded"
              exit="collapsed"
              variants={contentVariants}
              className="flex flex-col items-center gap-2 px-2"
            >
              {/* Render children in icon-only mode */}
              <div className="w-full flex flex-col items-center">
                {children}
              </div>
            </motion.div>
          ) : (
            // Full expanded state
            <motion.div
              key="expanded"
              initial="collapsed"
              animate="expanded"
              exit="collapsed"
              variants={contentVariants}
              className="px-4"
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.aside>
  );
}
