# Plan: Unified UX/UI Fusion

The goal is to seamlessly fuse the `ConsoleLayout` (Command Bar) and `DashboardLayout` (Content Area) into a single, cohesive experience, removing the visual disconnect and optimizing user interaction.

## 1. Core Concept: "The Floating Command Center"

Instead of `ConsoleLayout` being a separate block *above* the content, it will become a **Sticky, Glass-morphism Navigation Bar** that floats at the top of the Dashboard. This creates a unified "Operating System" feel.

### Key Changes:
-   **Visual Continuity**: The background texture will be continuous. The Console bar will be semi-transparent (`backdrop-blur`), allowing the Dashboard content to glide underneath it.
-   **Navigation Feedback**: The buttons in `DepartmentDock` (Archives, Roster, etc.) will act as a **Scroll Spy**. When the user scrolls to the "Archives" section, the "Archives" button in the dock will glow, indicating the current context.
-   **Interactive Flow**: Clicking a button smoothly scrolls to the section.

## 2. Component Refactoring

### A. `ConsoleLayout.tsx` (The Header)
-   **Layout**: Change `relative` positioning to `sticky top-0 z-50`.
-   **Style**: Remove the heavy "box" styling. Use a sleek, borderless (or bottom-border only) glass design.
-   **Integration**: Ensure it visually connects with the `GameContainer` above and `DashboardLayout` below.

### B. `DecreePipeline.tsx` (The Input)
-   **Current**: Likely generic input style.
-   **Redesign**: "Imperial Edict" Input.
    -   Background: Dark ink paper texture.
    -   Border: Subtle gold frame.
    -   Animation: When typing, simulating ink spreading or a cursor glowing.

### C. `MetricsPanel.tsx` (The Stats)
-   **Current**: Basic text/numbers.
-   **Redesign**: "Compass/Astrolabe" Widgets.
    -   Visualize CPU/Users/Fortune as circular gauges or minimal bars that fit the "Jade & Gold" theme.
    -   Match the glass style of `DepartmentDock`.

### D. `App.tsx` (The Container)
-   **Background**: Move the wood/paper texture to the `App` container level so it spans the entire scrollable area, eliminating seams between Console and Dashboard.

## 3. Interaction Logic (Scroll Spy)
-   **Hook**: Create a `useScrollSpy` hook or logic in `DashboardLayout`.
-   **State**: Track `activeSection` ('officials' | 'memorials' | 'logs').
-   **Prop**: Pass `activeSection` to `ConsoleLayout` -> `DepartmentDock` to highlight the correct button.

## 4. Execution Steps
1.  **Global Background**: Move textures to `App.tsx` wrapper.
2.  **Sticky Console**: Update `ConsoleLayout` CSS to be sticky and transparent.
3.  **Scroll Spy**: Implement scroll detection in `App.tsx` or `DashboardLayout` and pass state to `DepartmentDock`.
4.  **UI Polish**: Redesign `DecreePipeline` and `MetricsPanel` to match the new `DepartmentDock` style.
