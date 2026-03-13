# Plan: Enable Scrollable Dashboard Layout

The goal is to transform the application from a fixed-viewport "game window" into a scrollable, web-like experience where the user can scroll down to view detailed information (Memorials, Officials, Logs) instead of relying on pop-up modals.

## 1. Global Styles Update
- **File**: `src/index.css`
- **Action**: Remove `overflow: hidden` from `html`, `body`, and `#root` to enable global scrolling.

## 2. Component Refactoring (Support Embedded Mode)
We need to modify the existing panels to support an `embedded` mode, where they render as static content blocks rather than fixed overlays.

### A. MemorialsPanel
- **File**: `src/components/Console/MemorialsPanel.tsx`
- **Changes**:
    - Add `variant?: 'modal' | 'embedded'` prop (default to `modal`).
    - If `embedded`:
        - Remove `fixed inset-0`, background backdrop, and `AnimatePresence` wrapper.
        - Remove the Close button.
        - Ensure width/height are responsive (full width of container).

### B. OfficialsPanel
- **File**: `src/components/Console/OfficialsPanel.tsx`
- **Changes**:
    - Add `variant?: 'modal' | 'embedded'` prop.
    - Similar styling adjustments as MemorialsPanel.

### C. LogSidebar
- **File**: `src/components/Console/LogSidebar.tsx`
- **Changes**:
    - Add `variant?: 'modal' | 'embedded'` prop.
    - If `embedded`:
        - Render as a standard panel (similar style to Memorials) instead of a sliding sidebar.
        - Remove the absolute positioning and slide animations.

## 3. Create Dashboard Layout
- **File**: `src/components/Dashboard/DashboardLayout.tsx` (New File)
- **Content**:
    - A container component that renders the three panels in a vertical layout.
    - Use IDs for each section (e.g., `#memorials`, `#officials`, `#logs`) to allow smooth scrolling.
    - Add decorative dividers or headers between sections.

## 4. Update Console Interaction
- **File**: `src/components/Console/ConsoleLayout.tsx`
- **Changes**:
    - Remove the local state for modals (`showLogs`, `showOfficials`, `showMemorials`).
    - Remove the rendering of `<OfficialsPanel />`, `<MemorialsPanel />`, etc., from this component (they will move to DashboardLayout).
    - Update `DepartmentDock` and `MetricsPanel` callbacks to scroll to the respective sections in `DashboardLayout` instead of opening modals.
    - Change the root container styling to be relative (part of the document flow) rather than absolute/fixed.

## 5. Update Main App Layout
- **File**: `src/App.tsx`
- **Changes**:
    - Change the root container to `min-h-screen overflow-x-hidden`.
    - Structure:
        1. **Hero Section**: `GameContainer` (Fixed height, e.g., `h-[80vh]` or `h-screen`, possibly sticky).
        2. **Divider**: `ConsoleLayout` (Sticky top or static).
        3. **Content Section**: `DashboardLayout` (The new scrollable area).

## 6. Cleanup
- Verify that clicking "奏折" scrolls to the Memorials section.
- Verify that clicking "点卯" scrolls to the Officials section.
- Verify that clicking "Log" scrolls to the Logs section.
