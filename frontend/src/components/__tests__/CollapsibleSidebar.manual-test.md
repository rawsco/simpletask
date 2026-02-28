# CollapsibleSidebar Manual Test Guide

## Overview

This guide provides step-by-step instructions for manually testing the CollapsibleSidebar component to verify all requirements are met.

## Requirements Coverage

- **Requirement 22.1**: Toggle expand/collapse functionality
- **Requirement 22.2**: 300ms animation
- **Requirement 22.3**: Icon-only collapsed state
- **Requirement 22.4**: localStorage persistence
- **Requirement 22.5**: Responsive breakpoints (<1024px auto-collapse)

## Setup

1. Start the development server:
   ```bash
   cd frontend
   npm run dev
   ```

2. Create a test page that uses the CollapsibleSidebarExample component, or add it to an existing route.

## Test Cases

### Test 1: Basic Toggle Functionality (Requirement 22.1)

**Steps:**
1. Open the application in a browser
2. Locate the sidebar toggle button (chevron icon in top-right of sidebar)
3. Click the toggle button

**Expected Results:**
- ✓ Sidebar collapses to icon-only view (64px width)
- ✓ Toggle button icon changes from ChevronLeft to ChevronRight
- ✓ Button aria-label changes from "Collapse sidebar" to "Expand sidebar"
- ✓ Button aria-expanded attribute changes from "true" to "false"

**Steps (continued):**
4. Click the toggle button again

**Expected Results:**
- ✓ Sidebar expands to full view (256px width)
- ✓ Toggle button icon changes from ChevronRight to ChevronLeft
- ✓ Button aria-label changes from "Expand sidebar" to "Collapse sidebar"
- ✓ Button aria-expanded attribute changes from "false" to "true"

### Test 2: Animation Timing (Requirement 22.2)

**Steps:**
1. Open browser DevTools (F12)
2. Go to Performance tab
3. Start recording
4. Click the sidebar toggle button
5. Stop recording after animation completes

**Expected Results:**
- ✓ Animation completes within 300ms
- ✓ Animation is smooth with no jank
- ✓ Width transition uses easeInOut easing
- ✓ Content fade transition completes smoothly

**Alternative Test (Visual):**
1. Click the toggle button and observe the animation
2. Animation should feel smooth and natural
3. No sudden jumps or layout shifts

### Test 3: Icon-Only Collapsed State (Requirement 22.3)

**Steps:**
1. Collapse the sidebar using the toggle button
2. Observe the sidebar content

**Expected Results:**
- ✓ Sidebar width is 64px
- ✓ Navigation items are displayed (in icon-only mode if implemented)
- ✓ Text labels are hidden or truncated
- ✓ Content is centered within the collapsed width
- ✓ Scrolling still works if content overflows

### Test 4: localStorage Persistence (Requirement 22.4)

**Steps:**
1. Collapse the sidebar using the toggle button
2. Open browser DevTools (F12)
3. Go to Application/Storage tab
4. Check localStorage

**Expected Results:**
- ✓ Key "sidebar-collapsed" exists in localStorage
- ✓ Value is "true"

**Steps (continued):**
5. Refresh the page (F5)

**Expected Results:**
- ✓ Sidebar remains collapsed after page reload
- ✓ Toggle button shows "Expand sidebar" label

**Steps (continued):**
6. Expand the sidebar
7. Check localStorage again

**Expected Results:**
- ✓ Value of "sidebar-collapsed" is now "false"

**Steps (continued):**
8. Refresh the page

**Expected Results:**
- ✓ Sidebar remains expanded after page reload

### Test 5: Responsive Breakpoints (Requirement 22.5)

**Steps:**
1. Open the application with sidebar expanded
2. Open browser DevTools (F12)
3. Enable device toolbar (Ctrl+Shift+M or Cmd+Shift+M)
4. Set viewport width to 1280px (desktop)

**Expected Results:**
- ✓ Sidebar can be manually toggled
- ✓ Sidebar does not auto-collapse

**Steps (continued):**
5. Resize viewport to 1024px

**Expected Results:**
- ✓ Sidebar remains in current state (no auto-collapse at exactly 1024px)

**Steps (continued):**
6. Resize viewport to 1023px (just below breakpoint)

**Expected Results:**
- ✓ Sidebar auto-collapses
- ✓ Toggle button shows "Expand sidebar"

**Steps (continued):**
7. Resize viewport to 768px (tablet)

**Expected Results:**
- ✓ Sidebar remains collapsed
- ✓ Sidebar is still visible and functional

**Steps (continued):**
8. Resize viewport to 375px (mobile)

**Expected Results:**
- ✓ Sidebar remains collapsed
- ✓ Layout adapts appropriately

**Steps (continued):**
9. Resize viewport back to 1280px

**Expected Results:**
- ✓ Sidebar remains collapsed (does not auto-expand)
- ✓ User can manually expand if desired

### Test 6: Keyboard Accessibility

**Steps:**
1. Load the page
2. Press Tab repeatedly until the toggle button is focused

**Expected Results:**
- ✓ Toggle button receives visible focus indicator
- ✓ Focus ring is clearly visible

**Steps (continued):**
3. Press Enter or Space

**Expected Results:**
- ✓ Sidebar toggles (collapses or expands)
- ✓ Focus remains on toggle button

**Steps (continued):**
4. Press Tab to navigate to sidebar items

**Expected Results:**
- ✓ Focus moves to first interactive element in sidebar
- ✓ Tab order is logical

### Test 7: Reduced Motion Support

**Steps:**
1. Enable reduced motion in OS settings:
   - **Windows**: Settings > Ease of Access > Display > Show animations
   - **macOS**: System Preferences > Accessibility > Display > Reduce motion
   - **Linux**: Depends on desktop environment
2. Reload the page
3. Click the toggle button

**Expected Results:**
- ✓ Sidebar state changes instantly (no animation)
- ✓ Content appears/disappears without fade transition
- ✓ Functionality remains intact

**Alternative Test (Browser DevTools):**
1. Open DevTools (F12)
2. Open Command Palette (Ctrl+Shift+P or Cmd+Shift+P)
3. Type "Emulate CSS prefers-reduced-motion"
4. Select "prefers-reduced-motion: reduce"
5. Click the toggle button

**Expected Results:**
- ✓ Same as above

### Test 8: State Callback

**Steps:**
1. Open browser console (F12)
2. If using CollapsibleSidebarExample, check console output
3. Click the toggle button

**Expected Results:**
- ✓ Console shows sidebar state change (if logging is implemented)
- ✓ onCollapsedChange callback is called with correct boolean value

### Test 9: Custom Widths

**Steps:**
1. Modify CollapsibleSidebarExample to use custom widths:
   ```tsx
   <CollapsibleSidebar collapsedWidth={80} expandedWidth={320}>
   ```
2. Reload the page
3. Toggle the sidebar

**Expected Results:**
- ✓ Collapsed width is 80px (not default 64px)
- ✓ Expanded width is 320px (not default 256px)
- ✓ Animation still works smoothly

### Test 10: Error Handling

**Steps:**
1. Open browser console (F12)
2. Run: `localStorage.setItem('sidebar-collapsed', 'invalid-json')`
3. Reload the page

**Expected Results:**
- ✓ Page loads without errors
- ✓ Sidebar uses defaultCollapsed prop or defaults to expanded
- ✓ Error is logged to console (graceful degradation)

**Steps (continued):**
4. Clear localStorage: `localStorage.clear()`
5. Reload the page

**Expected Results:**
- ✓ Page loads without errors
- ✓ Sidebar uses defaultCollapsed prop

## Browser Compatibility Testing

Test the component in multiple browsers:

- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (macOS/iOS)
- [ ] Mobile browsers (Chrome Mobile, Safari Mobile)

## Performance Testing

**Steps:**
1. Open DevTools Performance tab
2. Record while toggling sidebar multiple times
3. Check for:
   - ✓ No layout thrashing
   - ✓ Smooth 60fps animation
   - ✓ No memory leaks
   - ✓ Efficient re-renders

## Accessibility Testing

**Tools:**
- [ ] Test with screen reader (NVDA, JAWS, VoiceOver)
- [ ] Run axe DevTools accessibility scan
- [ ] Test keyboard navigation
- [ ] Verify ARIA attributes

## Sign-off

| Test Case | Pass | Fail | Notes |
|-----------|------|------|-------|
| Test 1: Basic Toggle | ☐ | ☐ | |
| Test 2: Animation Timing | ☐ | ☐ | |
| Test 3: Icon-Only State | ☐ | ☐ | |
| Test 4: localStorage | ☐ | ☐ | |
| Test 5: Responsive | ☐ | ☐ | |
| Test 6: Keyboard | ☐ | ☐ | |
| Test 7: Reduced Motion | ☐ | ☐ | |
| Test 8: State Callback | ☐ | ☐ | |
| Test 9: Custom Widths | ☐ | ☐ | |
| Test 10: Error Handling | ☐ | ☐ | |

**Tester Name:** _______________  
**Date:** _______________  
**Browser/OS:** _______________  
**Overall Result:** ☐ Pass ☐ Fail

## Known Issues

Document any issues found during testing:

1. 
2. 
3. 

## Notes

Additional observations or comments:
