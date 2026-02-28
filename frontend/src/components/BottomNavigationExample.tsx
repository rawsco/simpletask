import { useState } from 'react';
import { BottomNavigation, NavigationItem } from './BottomNavigation';
import { Home, CheckSquare, Calendar, User, Bell } from 'lucide-react';

/**
 * BottomNavigationExample - Demonstrates usage of the BottomNavigation component
 * 
 * This example shows:
 * - Basic navigation setup with 5 items
 * - Active state management
 * - Notification badges
 * - Content area with proper padding
 */
export function BottomNavigationExample() {
  const [activeItem, setActiveItem] = useState('home');
  const [taskBadge, setTaskBadge] = useState(5);
  const [notificationBadge, setNotificationBadge] = useState(12);

  const navigationItems: NavigationItem[] = [
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
      badge: taskBadge,
    },
    {
      id: 'calendar',
      label: 'Calendar',
      icon: Calendar,
      href: '/calendar',
    },
    {
      id: 'notifications',
      label: 'Alerts',
      icon: Bell,
      href: '/notifications',
      badge: notificationBadge,
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      href: '/profile',
    },
  ];

  const handleItemChange = (itemId: string) => {
    setActiveItem(itemId);
    console.log('Navigation changed to:', itemId);
    
    // Simulate clearing badges when visiting the page
    if (itemId === 'tasks') {
      setTimeout(() => setTaskBadge(0), 1000);
    }
    if (itemId === 'notifications') {
      setTimeout(() => setNotificationBadge(0), 1000);
    }
  };

  // Simulate new notifications
  const addNotification = () => {
    setNotificationBadge(prev => prev + 1);
  };

  const addTask = () => {
    setTaskBadge(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Main content area with bottom padding to prevent overlap */}
      <main className="pb-20 md:pb-0 p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <h1 className="text-3xl font-bold text-foreground">
            Bottom Navigation Example
          </h1>
          
          <div className="bg-background-secondary rounded-lg p-6 space-y-4">
            <h2 className="text-xl font-semibold text-foreground">
              Current Page: {activeItem}
            </h2>
            
            <p className="text-foreground-secondary">
              The bottom navigation bar is fixed at the bottom of the screen
              and only visible on mobile viewports (width &lt; 768px).
            </p>

            <div className="space-y-2">
              <p className="text-sm text-foreground-secondary">
                Try these actions to see badge updates:
              </p>
              <div className="flex gap-2">
                <button
                  onClick={addTask}
                  className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                >
                  Add Task Badge
                </button>
                <button
                  onClick={addNotification}
                  className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                >
                  Add Notification Badge
                </button>
              </div>
            </div>
          </div>

          {/* Content sections for each navigation item */}
          {activeItem === 'home' && (
            <div className="bg-background-secondary rounded-lg p-6">
              <h2 className="text-2xl font-bold text-foreground mb-4">
                Welcome Home
              </h2>
              <p className="text-foreground-secondary">
                This is the home page content. The bottom navigation makes it
                easy to switch between different sections of the app.
              </p>
            </div>
          )}

          {activeItem === 'tasks' && (
            <div className="bg-background-secondary rounded-lg p-6">
              <h2 className="text-2xl font-bold text-foreground mb-4">
                Tasks
              </h2>
              <p className="text-foreground-secondary mb-4">
                Your task list appears here. Notice how the badge cleared when
                you navigated to this page.
              </p>
              <div className="space-y-2">
                <div className="p-3 bg-background rounded border border-border">
                  <p className="font-medium text-foreground">Complete project proposal</p>
                  <p className="text-sm text-foreground-secondary">Due today</p>
                </div>
                <div className="p-3 bg-background rounded border border-border">
                  <p className="font-medium text-foreground">Review pull requests</p>
                  <p className="text-sm text-foreground-secondary">Due tomorrow</p>
                </div>
              </div>
            </div>
          )}

          {activeItem === 'calendar' && (
            <div className="bg-background-secondary rounded-lg p-6">
              <h2 className="text-2xl font-bold text-foreground mb-4">
                Calendar
              </h2>
              <p className="text-foreground-secondary">
                Your calendar and upcoming events are displayed here.
              </p>
            </div>
          )}

          {activeItem === 'notifications' && (
            <div className="bg-background-secondary rounded-lg p-6">
              <h2 className="text-2xl font-bold text-foreground mb-4">
                Notifications
              </h2>
              <p className="text-foreground-secondary mb-4">
                Your notifications appear here. The badge cleared when you
                navigated to this page.
              </p>
              <div className="space-y-2">
                <div className="p-3 bg-background rounded border border-border">
                  <p className="font-medium text-foreground">New comment on your task</p>
                  <p className="text-sm text-foreground-secondary">2 minutes ago</p>
                </div>
                <div className="p-3 bg-background rounded border border-border">
                  <p className="font-medium text-foreground">Task assigned to you</p>
                  <p className="text-sm text-foreground-secondary">1 hour ago</p>
                </div>
              </div>
            </div>
          )}

          {activeItem === 'profile' && (
            <div className="bg-background-secondary rounded-lg p-6">
              <h2 className="text-2xl font-bold text-foreground mb-4">
                Profile
              </h2>
              <p className="text-foreground-secondary">
                Your profile settings and preferences are managed here.
              </p>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-primary-500/10 border border-primary-500/20 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Testing Instructions
            </h3>
            <ul className="space-y-2 text-sm text-foreground-secondary">
              <li>• Resize your browser to mobile width (&lt;768px) to see the navigation</li>
              <li>• Tap navigation items to switch between pages</li>
              <li>• Notice the smooth active indicator animation</li>
              <li>• Try the badge buttons to see notification badges</li>
              <li>• Test keyboard navigation with Tab and Enter keys</li>
              <li>• Check safe area insets on iPhone X+ devices</li>
            </ul>
          </div>

          {/* Spacer for demonstration */}
          <div className="h-96 bg-background-secondary rounded-lg p-6 flex items-center justify-center">
            <p className="text-foreground-secondary text-center">
              Scroll down to see how the bottom navigation stays fixed
            </p>
          </div>
        </div>
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation
        items={navigationItems}
        activeItem={activeItem}
        onItemChange={handleItemChange}
      />
    </div>
  );
}
