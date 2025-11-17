# Semester Volunteer Matching System - Design Guidelines

## Design Approach
**System**: Linear-inspired productivity interface with Material Design data patterns
**Rationale**: This is a utility-focused administrative tool requiring efficient workflows, clear data visualization, and minimal cognitive load. Linear's clarity and Material Design's robust data components provide the perfect foundation.

## Typography System

**Font Family**: 
- Primary: Inter (via Google Fonts CDN)
- Monospace: JetBrains Mono (for data/IDs)

**Type Scale**:
- Page Headers: text-3xl font-semibold
- Section Headers: text-xl font-semibold  
- Card Titles: text-base font-medium
- Body Text: text-sm font-normal
- Labels/Meta: text-xs font-medium uppercase tracking-wide
- Data/Numbers: text-sm font-mono

## Layout System

**Spacing Primitives**: Tailwind units of 2, 3, 4, 6, 8, 12, 16
- Consistent use of p-4, p-6, p-8 for component padding
- Gap spacing: gap-4 for cards, gap-2 for inline elements
- Section margins: mb-6, mb-8 for vertical rhythm

**Grid Structure**:
- Dashboard: Sidebar (256px fixed) + Main content area
- Content max-width: max-w-7xl
- Card grids: grid-cols-1 md:grid-cols-2 lg:grid-cols-3

## Component Library

### Navigation
**Sidebar Navigation** (Left-aligned, persistent):
- Fixed width sidebar with Mount Royal logo at top
- Vertical nav items with icons (Heroicons)
- Active state: subtle background treatment
- Sections: Dashboard, Run Matching, Review Groups, Unmatched Report, Settings

### Dashboard Layout
**Top Bar**:
- Full-width header with page title, breadcrumbs, and primary action button
- Height: h-16 with border-b
- Right-aligned: User profile dropdown

**Main Content Area**:
- Three-column stat cards showing: Total Learners, Total Peers, Matched This Semester
- Each stat card: Large number display, label, trend indicator
- Below stats: Recent activity timeline and quick actions panel

### Matching Run Interface
**Trigger Panel**:
- Prominent card with "Start New Matching Run" as primary action
- Display: Last run timestamp, data source sync status
- Secondary action: "Sync Google Sheets Data" button
- Progress indicator when run is active

### Review Groups Interface
**Group Cards Grid**:
- Card design: Bordered container with subtle shadow
- Card header: Course name (prominent), time slot badge
- Card body: List of learners (with avatars/initials), peer highlighted
- Card footer: Two-button action row (Approve - primary, Reject & Re-queue - secondary)

**Layout**: 2-column grid on desktop, single column on mobile/tablet

### Unmatched Report
**Data Table**:
- Clean table design with alternating row backgrounds
- Columns: Name, Role, Course, Constraint Failure, Suggested Alternative
- Row actions: Icon button for manual placement
- Sortable headers, search/filter bar above table
- Pagination at bottom

### Email Preview Modal
**Triggered on Approve**:
- Modal overlay showing email preview before sending
- Display: Recipients list, subject line, formatted email body
- Actions: Confirm Send, Edit, Cancel
- Checkbox: "Send me a copy"

## Icons
**Library**: Heroicons (outline style via CDN)
- Navigation icons: 24px
- Action buttons: 20px
- Inline/table icons: 16px
- Consistent use throughout for actions (play, check, x-mark, clock, users)

## Component Treatments
**Cards**: Rounded corners (rounded-lg), subtle border, minimal shadow
**Buttons**: 
- Primary: Solid, rounded-md, px-4 py-2
- Secondary: Outlined variant
- Destructive: Use for reject actions
**Badges**: Pill-shaped (rounded-full) for status indicators, time slots
**Forms**: Clean inputs with floating labels, grouped in logical sections
**Tables**: Minimal borders, clear header separation, hover states on rows

## Accessibility
- All interactive elements: min-height of h-10 (40px)
- Form inputs: Clear labels, error states with descriptive text
- Focus states: Visible ring on all interactive elements
- ARIA labels for icon-only buttons
- Keyboard navigation support throughout

## Images
**Mount Royal Logo**: Top-left of sidebar navigation (full color on light background)
**No hero image needed** - this is an administrative tool, not a marketing page

## Animations
**Minimal and purposeful only**:
- Page transitions: Subtle fade-in
- Button loading states: Spinner icon
- Success confirmations: Brief check animation
- Avoid decorative animations - focus on functional feedback

This design creates a professional, efficient administrative interface that prioritizes clarity, speed, and data-driven decision making.