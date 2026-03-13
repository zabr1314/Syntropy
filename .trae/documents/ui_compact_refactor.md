# Plan: Responsive & Compact UI Refactoring

The user wants a more "compact, beautiful, and reasonable" responsive layout.
Currently, the UI is a bit spread out with a very tall game container and a long scrollable dashboard.
The goal is to tighten the layout, perhaps making better use of screen real estate, especially on desktop.

## 1. Core Layout Strategy: "The Command Deck"

Instead of a strict "Top (Game) -> Bottom (Dashboard)" vertical scroll which can feel disconnected, we will switch to a **Split-Screen / Hybrid Layout** for desktop, while keeping the stack for mobile.

### Desktop Layout (lg+)
-   **Top (40-50vh)**: The Game World (Visuals).
-   **Middle (Sticky Bar)**: The Console/Command Center.
-   **Bottom (Remaining height or Scroll)**: The Dashboard Panels arranged in a dense grid.

**Crucial Change**: Reduce the height of the `GameContainer` to allow the Console and parts of the Dashboard to be visible "above the fold" (without scrolling). This makes the interface feel more like a control room.

## 2. Refactoring Steps

### A. App Layout (`src/App.tsx`)
-   **Game Container**: Change `h-screen` to `h-[60vh]` (or `min-h-[500px]`) on desktop. This immediately brings the console into view.
-   **Responsive**: On mobile, keep `h-[50vh]` or `aspect-square`.

### B. Console Bar (`src/components/Console/ConsoleLayout.tsx`)
-   **Compact Mode**: Reduce height from `100px` to `80px`.
-   **Padding**: Tighten horizontal padding.
-   **Flex**: Ensure it scales down gracefully on smaller screens.

### C. Dashboard Grid (`src/components/Dashboard/DashboardLayout.tsx`)
-   **Current**: 3 Vertical Sections (Officers, Memorials, Logs).
-   **New Compact Grid**:
    -   Use `grid-cols-12`.
    -   **Row 1**:
        -   **Left (Col 3)**: Officials (Mini-cards).
        -   **Right (Col 9)**: Memorials (Wide view) + Logs (Tabbed or Side-by-side).
    -   **Tabbed Interface**: Merge "Memorials" and "Logs" into a single panel with tabs to save space? OR keep them side-by-side but denser.
    -   **Density**: Reduce padding inside panels (`p-4` -> `p-3`).

### D. Panel Optimization
-   **OfficialsPanel**: Use a denser grid (e.g., `grid-cols-2` -> `grid-cols-3` or `grid-cols-4` on wide screens).
-   **MemorialsPanel**: Reduce the height of each item, use a more tabular or list-like view for history.

## 3. Visual Polish
-   **Borders**: Refine border widths (thinner is more modern).
-   **Typography**: Adjust font sizes for information density (smaller labels, clearer values).

## 4. Execution Plan
1.  **Adjust App.tsx**: Fix the viewport usage first.
2.  **Compact Console**: Tighten the command bar.
3.  **Refactor Dashboard**: Implement the dense grid layout.
