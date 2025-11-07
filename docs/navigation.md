# Navigation System

Heirlooms uses a responsive navigation system that adapts to different screen sizes for optimal user experience.

## Navigation Components

### Top Navigation (Desktop)
- **When Used**: Visible on desktop viewports (≥1024px / `lg` breakpoint)
- **Location**: Fixed at the top of the page (`components/top-nav.tsx`)
- **Features**:
  - Heirlooms logo and branding
  - Desktop navigation menu
  - Theme toggle
  - User profile access

### Bottom Navigation (Mobile/Tablet)
- **When Used**: Visible on mobile and tablet viewports (<1024px)
- **Location**: Fixed at the bottom of the page (`components/navigation/bottom-nav.tsx`)
- **Features**:
  - 5 primary navigation items: Home, Collections, Artifacts, Stories, Profile
  - Icon + label design
  - Active route highlighting
  - Safe-area inset support for iOS/Android
  - Analytics tracking on navigation clicks

## Breakpoints

The navigation system uses Tailwind's built-in breakpoints:

- **Mobile**: < 640px (sm)
- **Tablet**: 640px - 1023px (sm to md)
- **Desktop**: ≥ 1024px (lg)

Navigation switches at the `lg` breakpoint (1024px):
- Below `lg`: BottomNav is rendered, TopNav is hidden
- At `lg` and above: TopNav is rendered, BottomNav is not rendered (zero DOM presence)

## Adding a New Navigation Item

### Bottom Navigation

Edit `components/navigation/bottom-nav.tsx` and add a new item to the `navItems` array:

\`\`\`tsx
const navItems = [
  // ... existing items
  {
    label: "Settings",
    href: "/settings",
    icon: Settings, // Import from lucide-react
  },
]
\`\`\`

Make sure to import the icon from `lucide-react` at the top of the file.

### Top Navigation

Edit `components/top-nav.tsx` and add navigation links following the existing pattern.

## Disabling Bottom Padding on a Page

By default, all pages wrapped in `AppLayout` receive bottom padding on mobile to prevent content from being hidden behind the fixed BottomNav.

To disable this padding (e.g., for pages with custom sticky footers):

\`\`\`tsx
// In your page component
export default function CustomPage() {
  return (
    <AppLayout noBottomPadding>
      {/* Your page content */}
    </AppLayout>
  )
}
\`\`\`

Or by adding the `data-no-bottom-padding` attribute to skip the default padding:

\`\`\`tsx
<div data-no-bottom-padding>
  {/* Content without bottom padding */}
</div>
\`\`\`

## Safe Area Insets

The BottomNav automatically respects device safe areas using CSS environment variables:

\`\`\`css
padding-bottom: max(env(safe-area-inset-bottom, 0px), 8px)
\`\`\`

This ensures the navigation doesn't overlap with:
- iOS home indicators
- Android gesture navigation bars
- Device notches or rounded corners

The component is tested to work with a 24px safe area inset (typical Android gesture bar height).

## Analytics

The BottomNav fires analytics events on every navigation click:

**Event**: `nav_bottom_click`

**Payload**:
\`\`\`json
{
  "item": "Collections",
  "path": "/collections",
  "source": "bottom-nav"
}
\`\`\`

The tracking gracefully degrades if no analytics library is present (non-blocking).

## Technical Details

- **Component Location**: `components/navigation/bottom-nav.tsx`
- **Height**: 64px + safe-area-inset
- **Z-index**: Below side nav (z-50), above page content
- **Backdrop**: Blur effect with subtle border
- **Active State**: Uses `usePathname()` for client-side route detection
- **Accessibility**: Minimum 44px tap targets, `aria-current="page"` on active items
