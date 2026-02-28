import { Variants, Transition } from 'framer-motion';

/**
 * Check for reduced motion preference
 * Respects user's system-level accessibility settings
 */
export const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Base transition configurations
 * Provides consistent timing and easing across animations
 */
export const transitions = {
  fast: { duration: 0.15, ease: 'easeOut' } as Transition,
  normal: { duration: 0.3, ease: 'easeInOut' } as Transition,
  slow: { duration: 0.5, ease: 'easeInOut' } as Transition,
  spring: { type: 'spring', stiffness: 300, damping: 30 } as Transition,
  springBouncy: { type: 'spring', stiffness: 400, damping: 20 } as Transition,
} as const;

/**
 * Fade animation variants
 * Simple opacity transitions for subtle effects
 */
export const fadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: transitions.normal },
  exit: { opacity: 0, transition: transitions.fast },
};

/**
 * Slide up animation variants
 * Combines opacity with upward movement
 */
export const slideUpVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: transitions.normal },
  exit: { opacity: 0, y: -20, transition: transitions.fast },
};

/**
 * Slide down animation variants
 * Combines opacity with downward movement
 */
export const slideDownVariants: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: { opacity: 1, y: 0, transition: transitions.normal },
  exit: { opacity: 0, y: 20, transition: transitions.fast },
};

/**
 * Slide in from left animation variants
 * Horizontal slide animation for list items
 */
export const slideInLeftVariants: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: transitions.normal },
  exit: { opacity: 0, x: 20, transition: transitions.fast },
};

/**
 * Slide in from right animation variants
 * Horizontal slide animation for side panels
 */
export const slideInRightVariants: Variants = {
  hidden: { opacity: 0, x: 100 },
  visible: { opacity: 1, x: 0, transition: transitions.spring },
  exit: { opacity: 0, x: 100, transition: transitions.fast },
};

/**
 * Scale animation variants
 * Zoom effect for modals and dialogs
 */
export const scaleVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: transitions.normal },
  exit: { opacity: 0, scale: 0.95, transition: transitions.fast },
};

/**
 * Scale with bounce animation variants
 * More playful scale effect with spring physics
 */
export const scaleBounceVariants: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1, transition: transitions.springBouncy },
  exit: { opacity: 0, scale: 0.8, transition: transitions.fast },
};

/**
 * List item animation variants with stagger support
 * Animates items in sequence using custom index
 */
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

/**
 * Stagger container animation variants
 * Parent container that staggers child animations
 */
export const staggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.02,
      staggerDirection: -1,
    },
  },
};

/**
 * Fast stagger container for quick animations
 * Reduced delays for snappier feel
 */
export const staggerContainerFastVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03,
      delayChildren: 0,
    },
  },
};

/**
 * Task completion animation variants
 * Celebratory bounce effect for completing tasks
 */
export const taskCompleteVariants: Variants = {
  initial: { scale: 1 },
  complete: {
    scale: [1, 1.05, 1],
    transition: { duration: 0.3 },
  },
};

/**
 * Modal/Dialog animation variants
 * Combines scale and slide for modal entrance
 */
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

/**
 * Toast notification animation variants
 * Slides in from right with scale effect
 */
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

/**
 * Backdrop/Overlay animation variants
 * Fade effect for modal backdrops
 */
export const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

/**
 * Drag constraints for swipe gestures
 * Limits drag movement for task quick actions
 */
export const dragConstraints = {
  top: 0,
  bottom: 0,
  left: -100,
  right: 0,
};

/**
 * Helper function to get animation props with reduced motion support
 * Automatically disables animations when user prefers reduced motion
 * 
 * @param variants - The animation variants to use
 * @param custom - Optional custom data passed to variants
 * @returns Animation props object for motion components
 */
export const getAnimationProps = (variants: Variants, custom?: any) => {
  if (prefersReducedMotion()) {
    return {
      initial: false,
      animate: 'visible',
      exit: false,
      variants,
      custom,
    };
  }
  return {
    initial: 'hidden',
    animate: 'visible',
    exit: 'exit',
    variants,
    custom,
  };
};

/**
 * Helper function to conditionally apply animations
 * Returns empty object when reduced motion is preferred
 * 
 * @param animationProps - The animation properties to apply
 * @returns Animation props or empty object
 */
export const conditionalAnimation = (animationProps: Record<string, any>) => {
  if (prefersReducedMotion()) {
    return {};
  }
  return animationProps;
};

/**
 * Hover animation variants
 * Subtle scale effect for interactive elements
 */
export const hoverScale = {
  scale: 1.02,
  transition: transitions.fast,
};

/**
 * Tap animation variants
 * Quick scale down for button press feedback
 */
export const tapScale = {
  scale: 0.98,
  transition: transitions.fast,
};

/**
 * Page transition variants
 * Full page animations for route changes
 */
export const pageVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.2,
      ease: 'easeIn',
    },
  },
};

/**
 * Skeleton loader pulse animation
 * Continuous pulse effect for loading states
 */
export const skeletonPulseVariants: Variants = {
  pulse: {
    opacity: [0.5, 1, 0.5],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};
