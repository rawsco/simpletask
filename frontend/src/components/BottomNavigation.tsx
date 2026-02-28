import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { transitions, prefersReducedMotion } from '../lib/motion';

export interface NavigationItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
  badge?: number;
}

interface BottomNavigationProps {
  items: NavigationItem[];
  activeItem: string;
  onItemChange: (itemId: string) => void;
  className?: string;
}

/**
 * BottomNavigation - Fixed bottom navigation bar for mobile devices
 * 
 * Features:
 * - Fixed positioning at bottom of viewport
 * - Safe area insets for notched devices (iPhone X+, etc.)
 * - Icons and labels for navigation items
 * - Active item highlighting with animation
 * - Badge support for notifications
 * - Respects reduced motion preferences
 * - Only visible on mobile viewports (<768px)
 * 
 * Requirements: 21.1, 21.2, 21.3, 21.4, 21.5
 */
export function BottomNavigation({
  items,
  activeItem,
  onItemChange,
  className,
}: BottomNavigationProps) {
  const handleItemClick = (itemId: string) => {
    onItemChange(itemId);
    // Navigation is handled by the parent component or router
  };

  return (
    <motion.nav
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={prefersReducedMotion() ? { duration: 0 } : transitions.normal}
      className={cn(
        // Fixed positioning at bottom
        'fixed bottom-0 left-0 right-0',
        // Z-index to stay above content
        'z-50',
        // Background with blur effect for glassmorphism
        'bg-background/95 backdrop-blur-md',
        // Border for subtle separation
        'border-t border-border',
        // Safe area insets for notched devices (iPhone X+, etc.)
        'pb-safe',
        // Add padding for safe area on iOS devices
        'supports-[padding:env(safe-area-inset-bottom)]:pb-[env(safe-area-inset-bottom)]',
        // Shadow for depth
        'shadow-lg',
        // Only show on mobile viewports
        'md:hidden',
        className
      )}
      role="navigation"
      aria-label="Mobile bottom navigation"
    >
      <div className="flex items-center justify-around h-16 px-2">
        {items.map((item) => {
          const isActive = item.id === activeItem;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item.id)}
              className={cn(
                // Base styles
                'relative flex flex-col items-center justify-center',
                'min-w-[64px] h-full px-3 py-2',
                'rounded-lg transition-colors duration-200',
                // Interactive states
                'hover:bg-background-tertiary active:bg-background-tertiary',
                // Focus styles for accessibility
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
                // Active state
                isActive && 'text-primary-500',
                !isActive && 'text-foreground-secondary'
              )}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              {/* Icon with badge */}
              <div className="relative mb-1">
                <Icon
                  className={cn(
                    'w-6 h-6 transition-transform duration-200',
                    isActive && 'scale-110'
                  )}
                  aria-hidden="true"
                />
                
                {/* Badge for notifications */}
                {item.badge !== undefined && item.badge > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={prefersReducedMotion() ? { duration: 0 } : transitions.springBouncy}
                    className={cn(
                      'absolute -top-1 -right-1',
                      'min-w-[18px] h-[18px] px-1',
                      'flex items-center justify-center',
                      'text-[10px] font-semibold text-white',
                      'bg-error rounded-full',
                      'border-2 border-background'
                    )}
                    aria-label={`${item.badge} notifications`}
                  >
                    {item.badge > 99 ? '99+' : item.badge}
                  </motion.span>
                )}
              </div>

              {/* Label */}
              <span
                className={cn(
                  'text-xs font-medium transition-all duration-200',
                  isActive && 'font-semibold'
                )}
              >
                {item.label}
              </span>

              {/* Active indicator */}
              {isActive && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-primary-500 rounded-t-full"
                  transition={prefersReducedMotion() ? { duration: 0 } : transitions.spring}
                />
              )}
            </button>
          );
        })}
      </div>
    </motion.nav>
  );
}
