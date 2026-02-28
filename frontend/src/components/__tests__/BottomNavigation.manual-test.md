# BottomNavigation Manual Testing Guide

## Overview

This document provides manual testing procedures for the BottomNavigation component to verify all requirements are met.

## Requirements Coverage

- **21.1**: Display bottom navigation bar when viewport width < 768px
- **21.2**: Fixed positioning at bottom of viewport
- **21.3**: Display icons and labels for navigation items
- **21.4**: Highlight active navigation item
- **21.5**: Apply safe area insets for notched devices

## Test Environment Setup

### Prerequisites
- Modern browser (Chrome, Firefox, Safari, Edge)
- Mobile device or browser DevTools for responsive testing
- iPhone X+ or Android device with notch/gesture bar (for safe area testing)

### Running the Example
```bash
cd frontend
npm run dev
```

Navigate to the BottomNavigationExample component in your browser.

## Test Cases

### Test 1: Responsive Display (Requirement 21.1)

**Objective**: Verify navigation only appears on mobile viewports

**Steps**:
1. Open the BottomNavigationExample in a desktop browser
2. Open browser DevTools (F12)
3. Toggle device toolbar (Ctrl+Shift+M or Cmd+Shift+M)
4. Set viewport to 1024px width
5. Gradually reduce width to 768px, then 375px

**Expected Results**:
- ✓ Navigation is hidden at 768px and above
- ✓ Navigation appears at 767px and below
- ✓ Navigation remains visible at 375px (mobile)
- ✓ No horizontal scrolling occurs

**Pass/Fail**: ___________

---

### Test 2: Fixed Positioning (Requirement 21.2)

**Objective**: Verify navigation stays fixed at bottom during scroll

**Steps**:
1. Set viewport to mobile size (375px)
2. Scroll down the page content
3. Scroll back up
4. Scroll rapidly

**Expected Results**:
- ✓ Navigation remains fixed at bottom of viewport
- ✓ Navigation doesn't move during scroll
- ✓ Navigation stays above all content
- ✓ No flickering or jumping

**Pass/Fail**: ___________

---

### Test 3: Icons and Labels (Requirement 21.3)

**Objective**: Verify all navigation items display correctly

**Steps**:
1. Set viewport to mobile size (375px)
2. Observe the bottom navigation bar
3. Check each navigation item

**Expected Results**:
- ✓ All 5 navigation items are visible
- ✓ Each item has an icon displayed
- ✓ Each item has a label below the icon
- ✓ Icons are properly sized (24x24px)
- ✓ Labels are readable (12px font)
- ✓ Items are evenly spaced

**Pass/Fail**: ___________

---

### Test 4: Active Item Highlighting (Requirement 21.4)

**Objective**: Verify active navigation item is highlighted

**Steps**:
1. Set viewport to mobile size (375px)
2. Observe the "Home" item (should be active by default)
3. Tap the "Tasks" navigation item
4. Tap the "Calendar" navigation item
5. Tap back to "Home"

**Expected Results**:
- ✓ Active item has primary color (purple/indigo)
- ✓ Active item has indicator bar at bottom
- ✓ Indicator bar animates smoothly between items
- ✓ Only one item is active at a time
- ✓ Active item has `aria-current="page"` attribute
- ✓ Inactive items are gray/muted color

**Pass/Fail**: ___________

---

### Test 5: Safe Area Insets (Requirement 21.5)

**Objective**: Verify navigation respects device safe areas

**Steps**:
1. Open on iPhone X+ or use Safari DevTools with iPhone X simulation
2. Observe bottom spacing of navigation bar
3. Check if navigation overlaps home indicator
4. Test on Android device with gesture navigation

**Expected Results**:
- ✓ Navigation has extra padding at bottom on notched devices
- ✓ Navigation doesn't overlap home indicator
- ✓ Content is fully visible and tappable
- ✓ Safe area padding adjusts automatically
- ✓ Works on both iOS and Android

**Pass/Fail**: ___________

---

### Test 6: Badge Display

**Objective**: Verify notification badges work correctly

**Steps**:
1. Set viewport to mobile size (375px)
2. Observe the "Tasks" item (should show badge "5")
3. Observe the "Alerts" item (should show badge "12")
4. Click "Add Task Badge" button
5. Click "Add Notification Badge" button multiple times

**Expected Results**:
- ✓ Badges appear on correct items
- ✓ Badge count is readable
- ✓ Badges animate when appearing
- ✓ Badges show "99+" for counts over 99
- ✓ Badges have red background
- ✓ Badges don't overlap icon

**Pass/Fail**: ___________

---

### Test 7: Touch Interactions

**Objective**: Verify touch targets and interactions

**Steps**:
1. Use a mobile device or touch simulation
2. Tap each navigation item
3. Try tapping near edges of items
4. Tap rapidly between items

**Expected Results**:
- ✓ All items are easily tappable
- ✓ Touch targets are at least 44x44px
- ✓ No accidental taps on adjacent items
- ✓ Tap feedback is immediate
- ✓ Active state changes on tap

**Pass/Fail**: ___________

---

### Test 8: Keyboard Navigation

**Objective**: Verify keyboard accessibility

**Steps**:
1. Set viewport to mobile size (375px)
2. Press Tab key repeatedly
3. Press Shift+Tab to go backwards
4. Press Enter on a focused item
5. Press Space on a focused item

**Expected Results**:
- ✓ Tab moves focus between navigation items
- ✓ Shift+Tab moves focus backwards
- ✓ Focus indicator is clearly visible (2px ring)
- ✓ Enter activates the focused item
- ✓ Space activates the focused item
- ✓ Focus order is logical (left to right)

**Pass/Fail**: ___________

---

### Test 9: Screen Reader Support

**Objective**: Verify screen reader accessibility

**Steps**:
1. Enable screen reader (VoiceOver on iOS/Mac, TalkBack on Android)
2. Navigate to bottom navigation
3. Swipe through navigation items
4. Activate an item

**Expected Results**:
- ✓ Navigation is announced as "Mobile bottom navigation"
- ✓ Each item label is read correctly
- ✓ Active item is announced as "current page"
- ✓ Badge counts are announced (e.g., "5 notifications")
- ✓ All items are reachable with swipe gestures

**Pass/Fail**: ___________

---

### Test 10: Visual Design

**Objective**: Verify visual styling matches design system

**Steps**:
1. Set viewport to mobile size (375px)
2. Observe navigation bar styling
3. Check in both light and dark mode
4. Compare with design specifications

**Expected Results**:
- ✓ Background has glassmorphism effect (blur)
- ✓ Border at top is visible
- ✓ Shadow provides depth
- ✓ Colors match theme (primary purple/indigo)
- ✓ Spacing is consistent
- ✓ Works in both light and dark mode

**Pass/Fail**: ___________

---

### Test 11: Animation Performance

**Objective**: Verify animations are smooth

**Steps**:
1. Set viewport to mobile size (375px)
2. Tap between navigation items rapidly
3. Observe active indicator animation
4. Check badge animations
5. Enable "Reduce Motion" in system settings

**Expected Results**:
- ✓ Active indicator slides smoothly (no jank)
- ✓ Badge appears with spring animation
- ✓ Animations run at 60fps
- ✓ No layout shifts during animation
- ✓ Animations disabled when "Reduce Motion" is on

**Pass/Fail**: ___________

---

### Test 12: Content Overlap Prevention

**Objective**: Verify navigation doesn't overlap content

**Steps**:
1. Set viewport to mobile size (375px)
2. Scroll to bottom of page
3. Check if content is hidden behind navigation
4. Try to interact with content near bottom

**Expected Results**:
- ✓ Content has bottom padding (80px)
- ✓ All content is accessible
- ✓ No content hidden behind navigation
- ✓ Scroll reaches true bottom of content

**Pass/Fail**: ___________

---

### Test 13: Multiple Badge Scenarios

**Objective**: Test various badge states

**Steps**:
1. Set viewport to mobile size (375px)
2. Test with badge count 0
3. Test with badge count 1
4. Test with badge count 99
5. Test with badge count 100+

**Expected Results**:
- ✓ Badge hidden when count is 0
- ✓ Single digit displays correctly
- ✓ Two digits display correctly
- ✓ "99+" displays for counts over 99
- ✓ Badge doesn't break layout

**Pass/Fail**: ___________

---

### Test 14: Browser Compatibility

**Objective**: Verify cross-browser support

**Steps**:
1. Test in Chrome (mobile view)
2. Test in Safari (mobile view)
3. Test in Firefox (mobile view)
4. Test in Edge (mobile view)
5. Test on actual iOS device
6. Test on actual Android device

**Expected Results**:
- ✓ Works in Chrome
- ✓ Works in Safari
- ✓ Works in Firefox
- ✓ Works in Edge
- ✓ Works on iOS Safari
- ✓ Works on Android Chrome

**Pass/Fail**: ___________

---

### Test 15: Edge Cases

**Objective**: Test unusual scenarios

**Steps**:
1. Test with very long item labels
2. Test with 3 items (minimum)
3. Test with 6 items (maximum recommended)
4. Test with no badges
5. Test with all items having badges

**Expected Results**:
- ✓ Long labels truncate gracefully
- ✓ Works with 3 items
- ✓ Works with 6 items (may be cramped)
- ✓ Works without any badges
- ✓ Multiple badges don't overlap

**Pass/Fail**: ___________

---

## Test Summary

| Test Case | Pass | Fail | Notes |
|-----------|------|------|-------|
| 1. Responsive Display | ☐ | ☐ | |
| 2. Fixed Positioning | ☐ | ☐ | |
| 3. Icons and Labels | ☐ | ☐ | |
| 4. Active Highlighting | ☐ | ☐ | |
| 5. Safe Area Insets | ☐ | ☐ | |
| 6. Badge Display | ☐ | ☐ | |
| 7. Touch Interactions | ☐ | ☐ | |
| 8. Keyboard Navigation | ☐ | ☐ | |
| 9. Screen Reader | ☐ | ☐ | |
| 10. Visual Design | ☐ | ☐ | |
| 11. Animation Performance | ☐ | ☐ | |
| 12. Content Overlap | ☐ | ☐ | |
| 13. Badge Scenarios | ☐ | ☐ | |
| 14. Browser Compatibility | ☐ | ☐ | |
| 15. Edge Cases | ☐ | ☐ | |

**Total Passed**: _____ / 15

**Total Failed**: _____ / 15

## Issues Found

| Issue # | Description | Severity | Status |
|---------|-------------|----------|--------|
| | | | |

## Sign-off

**Tester Name**: _____________________

**Date**: _____________________

**Overall Result**: ☐ Pass ☐ Fail

**Notes**:
