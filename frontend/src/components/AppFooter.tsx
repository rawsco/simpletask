/**
 * AppFooter - Footer component for use with AppShell
 * 
 * Provides a consistent footer layout
 */
export function AppFooter() {
  const currentYear = new Date().getFullYear();
  
  return (
    <div className="flex items-center justify-center h-16 px-4 text-sm text-foreground-secondary">
      <p>© {currentYear} Task Manager. All rights reserved.</p>
    </div>
  );
}
