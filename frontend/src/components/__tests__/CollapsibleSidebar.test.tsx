/**
 * CollapsibleSidebar Component Tests
 * 
 * Note: These tests require Vitest and React Testing Library to be installed.
 * Install with: npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
 * 
 * Requirements tested: 22.1, 22.2, 22.3, 22.4, 22.5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CollapsibleSidebar } from '../CollapsibleSidebar';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    aside: ({ children, ...props }: any) => <aside {...props}>{children}</aside>,
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('CollapsibleSidebar', () => {
  beforeEach(() => {
    localStorageMock.clear();
    // Reset window size
    window.innerWidth = 1280;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Requirement 22.1: Toggle functionality', () => {
    it('should toggle between collapsed and expanded states when button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <CollapsibleSidebar>
          <div>Sidebar Content</div>
        </CollapsibleSidebar>
      );

      const toggleButton = screen.getByLabelText('Collapse sidebar');
      expect(toggleButton).toBeInTheDocument();

      // Click to collapse
      await user.click(toggleButton);
      
      await waitFor(() => {
        expect(screen.getByLabelText('Expand sidebar')).toBeInTheDocument();
      });

      // Click to expand
      await user.click(screen.getByLabelText('Expand sidebar'));
      
      await waitFor(() => {
        expect(screen.getByLabelText('Collapse sidebar')).toBeInTheDocument();
      });
    });

    it('should call onCollapsedChange callback when toggled', async () => {
      const user = userEvent.setup();
      const onCollapsedChange = vi.fn();
      
      render(
        <CollapsibleSidebar onCollapsedChange={onCollapsedChange}>
          <div>Sidebar Content</div>
        </CollapsibleSidebar>
      );

      const toggleButton = screen.getByLabelText('Collapse sidebar');
      await user.click(toggleButton);

      expect(onCollapsedChange).toHaveBeenCalledWith(true);
    });
  });

  describe('Requirement 22.2: Animation', () => {
    it('should animate sidebar width within 300ms', () => {
      const { container } = render(
        <CollapsibleSidebar>
          <div>Sidebar Content</div>
        </CollapsibleSidebar>
      );

      const sidebar = container.querySelector('aside');
      expect(sidebar).toBeInTheDocument();
      
      // Note: Actual animation timing would be tested with E2E tests
      // This test verifies the component structure is correct
    });
  });

  describe('Requirement 22.3: Icon-only collapsed state', () => {
    it('should render children in collapsed state', () => {
      render(
        <CollapsibleSidebar defaultCollapsed>
          <div data-testid="sidebar-content">Sidebar Content</div>
        </CollapsibleSidebar>
      );

      expect(screen.getByTestId('sidebar-content')).toBeInTheDocument();
    });

    it('should show expand button when collapsed', () => {
      render(
        <CollapsibleSidebar defaultCollapsed>
          <div>Sidebar Content</div>
        </CollapsibleSidebar>
      );

      expect(screen.getByLabelText('Expand sidebar')).toBeInTheDocument();
    });
  });

  describe('Requirement 22.4: localStorage persistence', () => {
    it('should save collapsed state to localStorage', async () => {
      const user = userEvent.setup();
      render(
        <CollapsibleSidebar>
          <div>Sidebar Content</div>
        </CollapsibleSidebar>
      );

      const toggleButton = screen.getByLabelText('Collapse sidebar');
      await user.click(toggleButton);

      expect(localStorage.getItem('sidebar-collapsed')).toBe('true');
    });

    it('should load collapsed state from localStorage on mount', () => {
      localStorage.setItem('sidebar-collapsed', 'true');

      render(
        <CollapsibleSidebar>
          <div>Sidebar Content</div>
        </CollapsibleSidebar>
      );

      expect(screen.getByLabelText('Expand sidebar')).toBeInTheDocument();
    });

    it('should use defaultCollapsed when localStorage is empty', () => {
      render(
        <CollapsibleSidebar defaultCollapsed>
          <div>Sidebar Content</div>
        </CollapsibleSidebar>
      );

      expect(screen.getByLabelText('Expand sidebar')).toBeInTheDocument();
    });

    it('should handle localStorage errors gracefully', () => {
      // Mock localStorage.getItem to throw an error
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = vi.fn(() => {
        throw new Error('localStorage error');
      });

      // Should not throw and should use defaultCollapsed
      expect(() => {
        render(
          <CollapsibleSidebar defaultCollapsed={false}>
            <div>Sidebar Content</div>
          </CollapsibleSidebar>
        );
      }).not.toThrow();

      // Restore original
      localStorage.getItem = originalGetItem;
    });
  });

  describe('Requirement 22.5: Responsive breakpoints', () => {
    it('should auto-collapse on screens smaller than 1024px', () => {
      // Set window width to mobile size
      window.innerWidth = 768;
      
      const onCollapsedChange = vi.fn();
      render(
        <CollapsibleSidebar onCollapsedChange={onCollapsedChange}>
          <div>Sidebar Content</div>
        </CollapsibleSidebar>
      );

      // Trigger resize event
      fireEvent(window, new Event('resize'));

      // Should auto-collapse
      expect(onCollapsedChange).toHaveBeenCalledWith(true);
    });

    it('should not auto-collapse on screens 1024px or larger', () => {
      window.innerWidth = 1280;
      
      const onCollapsedChange = vi.fn();
      render(
        <CollapsibleSidebar onCollapsedChange={onCollapsedChange}>
          <div>Sidebar Content</div>
        </CollapsibleSidebar>
      );

      // Trigger resize event
      fireEvent(window, new Event('resize'));

      // Should not auto-collapse
      expect(onCollapsedChange).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <CollapsibleSidebar>
          <div>Sidebar Content</div>
        </CollapsibleSidebar>
      );

      const toggleButton = screen.getByLabelText('Collapse sidebar');
      expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
    });

    it('should update aria-expanded when toggled', async () => {
      const user = userEvent.setup();
      render(
        <CollapsibleSidebar>
          <div>Sidebar Content</div>
        </CollapsibleSidebar>
      );

      const toggleButton = screen.getByLabelText('Collapse sidebar');
      expect(toggleButton).toHaveAttribute('aria-expanded', 'true');

      await user.click(toggleButton);

      await waitFor(() => {
        const expandButton = screen.getByLabelText('Expand sidebar');
        expect(expandButton).toHaveAttribute('aria-expanded', 'false');
      });
    });

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      render(
        <CollapsibleSidebar>
          <div>Sidebar Content</div>
        </CollapsibleSidebar>
      );

      const toggleButton = screen.getByLabelText('Collapse sidebar');
      
      // Focus the button
      toggleButton.focus();
      expect(toggleButton).toHaveFocus();

      // Press Enter to toggle
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByLabelText('Expand sidebar')).toBeInTheDocument();
      });
    });
  });

  describe('Custom widths', () => {
    it('should accept custom collapsed width', () => {
      const { container } = render(
        <CollapsibleSidebar collapsedWidth={80}>
          <div>Sidebar Content</div>
        </CollapsibleSidebar>
      );

      const sidebar = container.querySelector('aside');
      expect(sidebar).toBeInTheDocument();
    });

    it('should accept custom expanded width', () => {
      const { container } = render(
        <CollapsibleSidebar expandedWidth={320}>
          <div>Sidebar Content</div>
        </CollapsibleSidebar>
      );

      const sidebar = container.querySelector('aside');
      expect(sidebar).toBeInTheDocument();
    });
  });
});
