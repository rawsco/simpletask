import { ReactNode, useEffect, useState } from 'react';
import { motion, useScroll } from 'framer-motion';
import { cn } from '../lib/utils';

interface StickyHeaderProps {
  children: ReactNode;
  showShadow?: boolean;
  blurBackground?: boolean;
  className?: string;
}

/**
 * StickyHeader - Fixed header component with scroll-based effects
 * 
 * Features:
 * - Fixed positioning at top of viewport
 * - Backdrop blur effect for glassmorphism
 * - Scroll-based shadow that appears after 50px scroll
 * - Proper z-index layering to stay above content
 * - Smooth transitions for shadow appearance
 * 
 * Requirements: 19.1, 19.2, 19.3, 19.4
 */
export function StickyHeader({
  children,
  showShadow = true,
  blurBackground = true,
  className,
}: StickyHeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const { scrollY } = useScroll();

  useEffect(() => {
    const unsubscribe = scrollY.on('change', (latest) => {
      setIsScrolled(latest > 50);
    });

    return () => unsubscribe();
  }, [scrollY]);

  return (
    <motion.header
      className={cn(
        // Fixed positioning
        'fixed top-0 left-0 right-0',
        // Z-index layering - above content but below modals
        'z-40',
        // Background with blur effect
        blurBackground && 'bg-background/80 backdrop-blur-md',
        !blurBackground && 'bg-background',
        // Border for subtle separation
        'border-b border-border',
        // Transition for smooth shadow appearance
        'transition-shadow duration-300',
        className
      )}
      style={{
        // Apply shadow when scrolled past threshold
        boxShadow: showShadow && isScrolled
          ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
          : 'none',
      }}
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {children}
    </motion.header>
  );
}
