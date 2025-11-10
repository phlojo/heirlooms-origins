# iOS Safari Tap Behavior QA Checklist

## Test Environment
- **Device**: iPhone 12 or newer, iPad (latest)
- **Browser**: Safari (latest version)
- **Test Scenarios**: Portrait and landscape orientation

## Critical Tests

### ✅ Bottom Navigation Tap Reliability
- [ ] After a quick flick scroll (with inertia still settling), tap a bottom nav item once
  - **Expected**: Navigates/activates on first tap
  - **Actual**: _____
- [ ] Tap bottom nav immediately after scrolling stops
  - **Expected**: First-tap activation with no delay
  - **Actual**: _____
- [ ] Tap bottom nav items in rapid succession
  - **Expected**: Each tap registers without missed inputs
  - **Actual**: _____

### ✅ Safari Toolbar Dynamic Behavior
- [ ] With Safari toolbars expanded, tap bottom nav
  - **Expected**: Bottom nav remains visible and tappable
  - **Actual**: _____
- [ ] With Safari toolbars collapsed (scroll down), tap bottom nav
  - **Expected**: Bottom nav remains in same position, tappable on first try
  - **Actual**: _____
- [ ] Rapidly expand/collapse toolbars by scrolling
  - **Expected**: No visual jumpiness, no hit-test dead zones
  - **Actual**: _____

### ✅ Small Icon Button Taps
- [ ] Tap small icon buttons (settings, edit, delete)
  - **Expected**: No zoom, first-tap activation, comfortable hit area
  - **Actual**: _____
- [ ] Tap navigation chevrons in sticky headers
  - **Expected**: Immediate response, no delay after scroll
  - **Actual**: _____

### ✅ Carousel Interaction
- [ ] Swipe horizontally inside artifacts carousel on a vertical page
  - **Expected**: Horizontal swipe works smoothly
  - **Actual**: _____
- [ ] After horizontal swipe, tap a card action (e.g., view artifact)
  - **Expected**: First-tap activation, no need to tap twice
  - **Actual**: _____
- [ ] Check for page-level horizontal scrollbars
  - **Expected**: No horizontal overflow/scrollbar on mobile
  - **Actual**: _____

### ✅ Overlay Hit-Testing
- [ ] Open AlertDialog, then close it
  - **Expected**: After closing, tap underlying content works immediately
  - **Actual**: _____
- [ ] Open Dialog modal, then close it
  - **Expected**: Hidden overlay doesn't intercept taps
  - **Actual**: _____
- [ ] Navigate while a toast notification is visible
  - **Expected**: Toast doesn't block navigation taps
  - **Actual**: _____

### ✅ Input Focus Behavior
- [ ] Tap on text input fields
  - **Expected**: No unintentional zoom on focus
  - **Actual**: _____
- [ ] Focus on email/password inputs in login form
  - **Expected**: 16px font size prevents auto-zoom
  - **Actual**: _____

### ✅ Safe Area Handling
- [ ] Check bottom nav spacing near home indicator
  - **Expected**: No overlap with home indicator, no dead zones
  - **Actual**: _____
- [ ] Check top nav/content near notch
  - **Expected**: Content respects safe-area-inset-top
  - **Actual**: _____
- [ ] Rotate device to landscape
  - **Expected**: Safe areas adjust, no content cutoff
  - **Actual**: _____

### ✅ Momentum Scroll Guard (Optional)
- [ ] Fast flick scroll, then immediately tap a critical button
  - **Expected**: Brief guard prevents accidental tap during momentum (if implemented)
  - **Actual**: _____
- [ ] Normal scroll with gradual stop, then tap
  - **Expected**: Tap works immediately after controlled stop
  - **Actual**: _____

## Edge Cases

### Transform and Stacking Context
- [ ] Tap buttons inside transformed containers (e.g., scaled cards)
  - **Expected**: No mysterious "can't tap" areas
  - **Actual**: _____

### Nested Scroll Areas
- [ ] Vertical scroll page containing horizontal carousel
  - **Expected**: Vertical and horizontal gestures don't interfere
  - **Actual**: _____

### Multi-Touch
- [ ] Two-finger pinch/zoom (if enabled)
  - **Expected**: Gestures don't break tap detection
  - **Actual**: _____

## Cross-Platform Verification

### Android Chrome (Reference)
- [ ] All above tests pass on Android Chrome
  - **Expected**: No regressions, consistent behavior
  - **Actual**: _____

### Desktop Safari (Reference)
- [ ] Navigation and interactions work smoothly
  - **Expected**: No visual regressions, hover states work
  - **Actual**: _____

## Performance Metrics
- **Time to first tap after scroll**: _____ms (target: <100ms)
- **False tap rate**: _____ (target: <5%)
- **Missed tap rate**: _____ (target: 0%)

## Notes
_Document any unexpected behavior, workarounds, or areas needing further optimization:_

---

**Tested by**: _____
**Date**: _____
**iOS Version**: _____
**Safari Version**: _____
