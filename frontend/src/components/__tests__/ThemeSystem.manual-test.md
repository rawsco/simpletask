# Theme System Manual Test Guide

This document provides manual testing steps to verify the theme system implementation.

## Test Cases

### 1. Theme Toggle Functionality

**Steps:**
1. Start the development server: `npm run dev`
2. Navigate to the Tasks page (after login)
3. Locate the theme toggle button in the header (next to Logout)
4. Click the theme toggle dropdown

**Expected Results:**
- Dropdown menu appears with three options: Light, Dark, System
- Current theme has a checkmark (✓) next to it
- Default theme should be "System" on first load

### 2. Light Theme

**Steps:**
1. Click "Light" in the theme dropdown

**Expected Results:**
- Background changes to white (#ffffff)
- Text changes to dark color
- All UI elements use light theme colors
- Theme preference is saved to localStorage
- Meta theme-color updates to #ffffff

### 3. Dark Theme

**Steps:**
1. Click "Dark" in the theme dropdown

**Expected Results:**
- Background changes to dark (#0a0a0a)
- Text changes to light color
- All UI elements use dark theme colors
- Theme preference is saved to localStorage
- Meta theme-color updates to #0a0a0a

### 4. System Theme

**Steps:**
1. Click "System" in the theme dropdown
2. Change your OS theme preference (if possible)

**Expected Results:**
- Theme matches system preference
- When system theme changes, app theme updates automatically
- Theme preference "system" is saved to localStorage

### 5. Theme Persistence

**Steps:**
1. Select a theme (Light or Dark)
2. Refresh the page
3. Close and reopen the browser tab

**Expected Results:**
- Selected theme persists across page refreshes
- Selected theme persists across browser sessions
- Theme is loaded from localStorage on app start

### 6. Smooth Transitions

**Steps:**
1. Toggle between Light and Dark themes multiple times

**Expected Results:**
- Color transitions are smooth (300ms duration)
- No jarring flashes or layout shifts
- All elements transition together

### 7. High Contrast Mode (Future Enhancement)

**Note:** High contrast mode is implemented in the context but not yet exposed in the UI.

**Steps:**
1. Open browser DevTools console
2. Run: `localStorage.setItem('task-manager-theme-high-contrast', 'true')`
3. Refresh the page

**Expected Results:**
- High contrast styles are applied
- Contrast ratios meet WCAG AAA standards
- Decorative gradients and shadows are removed

### 8. Accessibility

**Steps:**
1. Use keyboard navigation (Tab key) to focus the theme toggle
2. Press Enter or Space to open the dropdown
3. Use arrow keys to navigate options
4. Press Enter to select an option

**Expected Results:**
- Theme toggle is keyboard accessible
- Focus indicators are visible
- Dropdown can be operated without mouse
- Screen readers announce theme changes

### 9. Mobile Responsiveness

**Steps:**
1. Open the app on a mobile device or use browser DevTools mobile emulation
2. Locate the theme toggle in the header
3. Tap the theme toggle

**Expected Results:**
- Theme toggle is touch-friendly (44x44px minimum)
- Dropdown menu is easy to use on mobile
- Theme changes work correctly on mobile

### 10. Integration with Existing UI

**Steps:**
1. Navigate through different pages (Login, Register, Tasks)
2. Toggle theme on each page

**Expected Results:**
- Theme applies consistently across all pages
- All components respect the theme
- No visual glitches or unstyled elements

## Verification Checklist

- [ ] Theme toggle appears in the header
- [ ] Light theme works correctly
- [ ] Dark theme works correctly
- [ ] System theme works correctly
- [ ] Theme preference persists in localStorage
- [ ] Theme loads correctly on page refresh
- [ ] Smooth color transitions (300ms)
- [ ] Meta theme-color updates for mobile browsers
- [ ] Keyboard navigation works
- [ ] Touch-friendly on mobile
- [ ] No console errors
- [ ] Build completes successfully

## Known Limitations

1. High contrast mode is not yet exposed in the UI (requires additional toggle)
2. Theme toggle is only visible on the Tasks page (should be added to other pages)
3. No unit tests yet (requires test setup with Vitest)

## Next Steps

1. Add theme toggle to other pages (Login, Register)
2. Create a settings page with high contrast toggle
3. Add unit tests for ThemeContext and ThemeToggle
4. Add E2E tests for theme functionality
5. Test with screen readers for accessibility
