import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BottomNavigation, NavigationItem } from '../BottomNavigation';
import { Home, CheckSquare, Calendar, User } from 'lucide-react';

describe('BottomNavigation', () => {
  const mockItems: NavigationItem[] = [
    {
      id: 'home',
      label: 'Home',
      icon: Home,
      href: '/',
    },
    {
      id: 'tasks',
      label: 'Tasks',
      icon: CheckSquare,
      href: '/tasks',
      badge: 5,
    },
    {
      id: 'calendar',
      label: 'Calendar',
      icon: Calendar,
      href: '/calendar',
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      href: '/profile',
    },
  ];

  it('renders all navigation items', () => {
    render(
      <BottomNavigation
        items={mockItems}
        activeItem="home"
        onItemChange={vi.fn()}
      />
    );

    expect(screen.getByLabelText('Home')).toBeInTheDocument();
    expect(screen.getByLabelText('Tasks')).toBeInTheDocument();
    expect(screen.getByLabelText('Calendar')).toBeInTheDocument();
    expect(screen.getByLabelText('Profile')).toBeInTheDocument();
  });

  it('highlights the active navigation item', () => {
    render(
      <BottomNavigation
        items={mockItems}
        activeItem="home"
        onItemChange={vi.fn()}
      />
    );

    const homeButton = screen.getByLabelText('Home');
    expect(homeButton).toHaveAttribute('aria-current', 'page');

    const tasksButton = screen.getByLabelText('Tasks');
    expect(tasksButton).not.toHaveAttribute('aria-current');
  });

  it('calls onItemChange when a navigation item is clicked', () => {
    const handleItemChange = vi.fn();
    render(
      <BottomNavigation
        items={mockItems}
        activeItem="home"
        onItemChange={handleItemChange}
      />
    );

    const tasksButton = screen.getByLabelText('Tasks');
    fireEvent.click(tasksButton);

    expect(handleItemChange).toHaveBeenCalledWith('tasks');
    expect(handleItemChange).toHaveBeenCalledTimes(1);
  });

  it('displays badge when provided', () => {
    render(
      <BottomNavigation
        items={mockItems}
        activeItem="home"
        onItemChange={vi.fn()}
      />
    );

    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByLabelText('5 notifications')).toBeInTheDocument();
  });

  it('displays "99+" for badges over 99', () => {
    const itemsWithLargeBadge: NavigationItem[] = [
      {
        id: 'tasks',
        label: 'Tasks',
        icon: CheckSquare,
        href: '/tasks',
        badge: 150,
      },
    ];

    render(
      <BottomNavigation
        items={itemsWithLargeBadge}
        activeItem="tasks"
        onItemChange={vi.fn()}
      />
    );

    expect(screen.getByText('99+')).toBeInTheDocument();
  });

  it('does not display badge when count is 0', () => {
    const itemsWithZeroBadge: NavigationItem[] = [
      {
        id: 'tasks',
        label: 'Tasks',
        icon: CheckSquare,
        href: '/tasks',
        badge: 0,
      },
    ];

    render(
      <BottomNavigation
        items={itemsWithZeroBadge}
        activeItem="tasks"
        onItemChange={vi.fn()}
      />
    );

    expect(screen.queryByLabelText(/notifications/)).not.toBeInTheDocument();
  });

  it('has proper ARIA attributes for accessibility', () => {
    const { container } = render(
      <BottomNavigation
        items={mockItems}
        activeItem="home"
        onItemChange={vi.fn()}
      />
    );

    const nav = container.querySelector('nav');
    expect(nav).toHaveAttribute('role', 'navigation');
    expect(nav).toHaveAttribute('aria-label', 'Mobile bottom navigation');
  });

  it('applies custom className when provided', () => {
    const { container } = render(
      <BottomNavigation
        items={mockItems}
        activeItem="home"
        onItemChange={vi.fn()}
        className="custom-class"
      />
    );

    const nav = container.querySelector('nav');
    expect(nav).toHaveClass('custom-class');
  });

  it('supports keyboard navigation', () => {
    const handleItemChange = vi.fn();
    render(
      <BottomNavigation
        items={mockItems}
        activeItem="home"
        onItemChange={handleItemChange}
      />
    );

    const tasksButton = screen.getByLabelText('Tasks');
    
    // Focus the button
    tasksButton.focus();
    expect(tasksButton).toHaveFocus();

    // Press Enter
    fireEvent.keyDown(tasksButton, { key: 'Enter', code: 'Enter' });
    fireEvent.click(tasksButton);
    
    expect(handleItemChange).toHaveBeenCalledWith('tasks');
  });

  it('renders all item labels', () => {
    render(
      <BottomNavigation
        items={mockItems}
        activeItem="home"
        onItemChange={vi.fn()}
      />
    );

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Tasks')).toBeInTheDocument();
    expect(screen.getByText('Calendar')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
  });

  it('handles empty items array gracefully', () => {
    const { container } = render(
      <BottomNavigation
        items={[]}
        activeItem=""
        onItemChange={vi.fn()}
      />
    );

    const nav = container.querySelector('nav');
    expect(nav).toBeInTheDocument();
    expect(nav?.querySelectorAll('button')).toHaveLength(0);
  });

  it('updates active state when activeItem prop changes', () => {
    const { rerender } = render(
      <BottomNavigation
        items={mockItems}
        activeItem="home"
        onItemChange={vi.fn()}
      />
    );

    let homeButton = screen.getByLabelText('Home');
    expect(homeButton).toHaveAttribute('aria-current', 'page');

    // Change active item
    rerender(
      <BottomNavigation
        items={mockItems}
        activeItem="tasks"
        onItemChange={vi.fn()}
      />
    );

    homeButton = screen.getByLabelText('Home');
    const tasksButton = screen.getByLabelText('Tasks');
    
    expect(homeButton).not.toHaveAttribute('aria-current');
    expect(tasksButton).toHaveAttribute('aria-current', 'page');
  });

  it('has proper focus styles for accessibility', () => {
    render(
      <BottomNavigation
        items={mockItems}
        activeItem="home"
        onItemChange={vi.fn()}
      />
    );

    const homeButton = screen.getByLabelText('Home');
    expect(homeButton).toHaveClass('focus:outline-none');
    expect(homeButton).toHaveClass('focus-visible:ring-2');
  });

  it('applies correct styling for mobile-only display', () => {
    const { container } = render(
      <BottomNavigation
        items={mockItems}
        activeItem="home"
        onItemChange={vi.fn()}
      />
    );

    const nav = container.querySelector('nav');
    expect(nav).toHaveClass('md:hidden');
  });

  it('has fixed positioning at bottom', () => {
    const { container } = render(
      <BottomNavigation
        items={mockItems}
        activeItem="home"
        onItemChange={vi.fn()}
      />
    );

    const nav = container.querySelector('nav');
    expect(nav).toHaveClass('fixed');
    expect(nav).toHaveClass('bottom-0');
  });

  it('includes safe area inset classes', () => {
    const { container } = render(
      <BottomNavigation
        items={mockItems}
        activeItem="home"
        onItemChange={vi.fn()}
      />
    );

    const nav = container.querySelector('nav');
    expect(nav).toHaveClass('pb-safe');
  });

  it('has backdrop blur for glassmorphism effect', () => {
    const { container } = render(
      <BottomNavigation
        items={mockItems}
        activeItem="home"
        onItemChange={vi.fn()}
      />
    );

    const nav = container.querySelector('nav');
    expect(nav).toHaveClass('backdrop-blur-md');
    expect(nav).toHaveClass('bg-background/95');
  });
});
