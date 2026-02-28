import { StickyHeader } from './StickyHeader';
import { AppHeader } from './AppHeader';
import { ThemeToggle } from './ThemeToggle';

/**
 * StickyHeaderExample - Demonstrates usage of the StickyHeader component
 * 
 * This example shows how to integrate StickyHeader with AppHeader
 * to create a fixed navigation bar with scroll-based effects.
 * 
 * Features demonstrated:
 * - Fixed positioning that stays at top during scroll
 * - Backdrop blur for glassmorphism effect
 * - Shadow that appears after scrolling 50px
 * - Integration with existing AppHeader component
 */
export function StickyHeaderExample() {
  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header with default settings */}
      <StickyHeader>
        <AppHeader
          title="Task Manager"
          actions={
            <>
              <button className="px-4 py-2 text-sm font-medium text-foreground hover:text-primary-500 transition-colors">
                Tasks
              </button>
              <button className="px-4 py-2 text-sm font-medium text-foreground hover:text-primary-500 transition-colors">
                Categories
              </button>
              <ThemeToggle />
            </>
          }
        />
      </StickyHeader>

      {/* Main content with padding to account for fixed header */}
      <main className="pt-16">
        <div className="container mx-auto px-4 py-8">
          <h2 className="text-3xl font-bold mb-4">Scroll to see the header effect</h2>
          <p className="text-foreground-secondary mb-8">
            As you scroll down past 50 pixels, the header will gain a shadow effect
            to indicate it's floating above the content.
          </p>

          {/* Dummy content to enable scrolling */}
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="mb-6 p-6 bg-background-secondary rounded-lg">
              <h3 className="text-xl font-semibold mb-2">Content Section {i + 1}</h3>
              <p className="text-foreground-secondary">
                This is example content to demonstrate the sticky header behavior.
                The header remains fixed at the top of the viewport as you scroll,
                and a shadow appears after scrolling 50 pixels to create depth.
              </p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

/**
 * Alternative example without backdrop blur
 */
export function StickyHeaderSolidExample() {
  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header without blur effect */}
      <StickyHeader blurBackground={false}>
        <AppHeader
          title="Task Manager"
          actions={<ThemeToggle />}
        />
      </StickyHeader>

      <main className="pt-16">
        <div className="container mx-auto px-4 py-8">
          <h2 className="text-3xl font-bold mb-4">Solid Background Header</h2>
          <p className="text-foreground-secondary">
            This example uses a solid background instead of the blur effect.
          </p>
        </div>
      </main>
    </div>
  );
}

/**
 * Example with custom styling
 */
export function StickyHeaderCustomExample() {
  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header with custom className */}
      <StickyHeader className="border-b-2 border-primary-500">
        <AppHeader
          title="Task Manager"
          actions={<ThemeToggle />}
        />
      </StickyHeader>

      <main className="pt-16">
        <div className="container mx-auto px-4 py-8">
          <h2 className="text-3xl font-bold mb-4">Custom Styled Header</h2>
          <p className="text-foreground-secondary">
            This example shows how to customize the header with additional classes.
          </p>
        </div>
      </main>
    </div>
  );
}
