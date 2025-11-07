# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Bottom Navigation for Mobile/Tablet**: Implemented responsive bottom navigation bar for viewports below 1024px (lg breakpoint)
  - Fixed bottom bar with 5 primary navigation items (Home, Collections, Artifacts, Stories, Profile)
  - Icon + label design with minimum 44px tap targets for accessibility
  - Active route highlighting with exact and nested path matching
  - Safe-area inset support for iOS home indicators and Android gesture navigation
  - Analytics tracking for navigation clicks (`nav_bottom_click` event)
  - Backdrop blur effect with subtle border styling
  - Zero DOM presence on desktop (conditionally rendered, not just hidden)
- **Navigation Documentation**: Added comprehensive navigation system documentation in `docs/navigation.md`
  - Breakpoint behavior and usage guidelines
  - Instructions for adding new navigation items
  - Safe-area handling details
  - Page-level bottom padding escape hatch

### Changed
- **Top Navigation**: Now hidden on mobile/tablet (<1024px) and visible only on desktop (≥1024px)
- **Layout System**: Updated `AppLayout` component with responsive bottom padding
  - Automatic bottom padding on mobile to prevent content overlap with BottomNav
  - Optional `noBottomPadding` prop for pages with custom footers
  - CSS variable `--bottom-nav-height` for consistent spacing (80px)

### Technical
- Component location: `components/navigation/bottom-nav.tsx`
- Uses `usePathname()` hook for client-side active state detection
- Leverages Tailwind's `lg:` breakpoint for responsive behavior
- Custom hook `useIsMobile()` for conditional rendering based on viewport width
