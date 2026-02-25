# Home Dashboard Design

## Goal
Create a white-based, professional dashboard home screen for emergency transport support operations on Next.js.

## Scope
- Left collapsible sidebar with smooth open/close behavior.
- Sidebar menu items: Home, Case Search, Hospital Search, Settings.
- Sidebar footer showing ambulance unit name and small unit ID.
- Main area table for past cases with required columns.
- Row-level "Details" button linking to case detail route.
- Target usage: desktop and iPad landscape.

## Visual Direction
- Minimal medical UI style.
- White and cool gray base with strong blue accent.
- Secondary accents: teal and amber.
- Light borders, soft shadows, clear visual hierarchy.

## Information Layout
- Two-column dashboard:
  - Left: sidebar (expanded/collapsed state).
  - Right: header + table card.
- Table columns:
  - Case ID
  - Aware Date (m/d)
  - Aware Time (h:mm)
  - Address
  - Name
  - Age
  - Destination ("-" if undecided)
  - Action button (Details)

## Interaction
- Sidebar width transition: about 220ms, ease-out.
- Menu labels fade/slide when collapsing.
- Table row hover highlight for readability.

## Non-Goals
- API/database integration.
- Case detail page implementation.
- Mobile-first optimization.
