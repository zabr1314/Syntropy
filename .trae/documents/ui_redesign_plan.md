# Plan: UI Redesign & Refactoring

The user finds the current UI "too rough" and requests a "beautiful layout" with a "complete refactor" if necessary.
The goal is to create a more polished, cohesive, and aesthetically pleasing interface that fits the "Imperial Court" theme while maintaining modern usability.

## 1. Design Concept: "Neo-Imperial Dashboard"
- **Theme**: Dark, rich wood textures, gold accents, and subtle paper/ink elements. A blend of ancient Chinese aesthetics with modern sci-fi dashboard elements (Cyber-Dynasty).
- **Layout**:
    - **Hero**: The Phaser Game (The "Court") remains the focal point at the top.
    - **Navigation/Console**: A sticky, sleek control bar that separates the game from the data.
    - **Data Deck**: A grid-based, modular layout for the "Dashboard" content (Memorials, Officials, Logs).

## 2. Refactoring Steps

### A. Global Typography & Colors (`src/index.css`)
- **Action**: Refine the color palette.
    - **Primary**: Deep Imperial Red (`#2c0b0e`), Dark Wood (`#1a0f0f`).
    - **Accent**: Muted Gold (`#d4af37`), Jade Green (`#4d7c5e`) for success, Vermilion (`#c0392b`) for alerts.
    - **Text**: Off-white/Parchment (`#e6d5ac`) for readability against dark backgrounds.
- **Action**: Ensure `ArkPixel` font is used consistently for headings, but maybe a clean sans-serif (Inter/system-ui) for dense data (logs/lists) to improve readability.

### B. App Layout Structure (`src/App.tsx`)
- **Current**: `GameContainer` (Sticky) -> `ConsoleLayout` -> `DashboardLayout`.
- **Refinement**:
    - Keep the sticky game behavior (it's good for context).
    - Improve the transition between the game and the dashboard.
    - Add a subtle shadow/gradient overlay at the bottom of the game container to blend it into the console.

### C. Console Bar Redesign (`src/components/Console/ConsoleLayout.tsx`)
- **Critique**: The current "wood texture" and "candle" effects might look a bit cheap if not high quality.
- **Redesign**:
    - Make it sleeker. A dark, semi-transparent glass-morphism bar with gold borders.
    - Organize controls better:
        - **Left**: Navigation tabs (Overview, Officials, Archives).
        - **Center**: The "Decree Input" (Command Line) - make it look like an imperial scroll or a jade tablet.
        - **Right**: System Metrics (CPU/Fortune) - visualized as hexagonal charts or ancient compass dials.

### D. Dashboard Grid System (`src/components/Dashboard/DashboardLayout.tsx`)
- **Critique**: The current vertical stack is functional but plain.
- **Redesign**:
    - Use a **Masonry or Bento Grid** layout.
    - **Card Design**:
        - **Memorials**: A horizontal scrolling list of "Scrolls" or a Kanban board.
        - **Officials**: A grid of character cards (portraits + stats) instead of a simple table.
        - **Logs**: A terminal-like window but styled as "Bamboo Slips" or an Ink Log.
    - **Interactivity**: Hover effects, smooth transitions.

### E. Component Specifics

#### 1. Officials Panel (`src/components/Console/OfficialsPanel.tsx`)
- Turn the table into a **Card Grid**.
- Each card shows: Avatar (icon), Name, Role, Status (with a glowing indicator), and Efficiency bar.

#### 2. Memorials Panel (`src/components/Console/MemorialsPanel.tsx`)
- Style the decree list items as **Imperial Scrolls**.
- Use distinct visual states for Pending, Approved, Rejected.

#### 3. Log Sidebar (`src/components/Console/LogSidebar.tsx`)
- Rename to `SystemLogPanel`.
- Style it like a high-tech/magical record book.
- Use distinct colors for different actors (Emperor = Gold, Minister = Purple).

## 3. Implementation Plan

1.  **Style System Upgrade**: Update `tailwind.config.js` (if needed) or `index.css` with new utility classes for the "Neo-Imperial" look (glassmorphism, gold gradients).
2.  **Console Bar Refactor**: Rewrite `ConsoleLayout` to be cleaner and more modern.
3.  **Dashboard Layout**: Rewrite `DashboardLayout` to use a Grid/Bento layout.
4.  **Component Styling**: iteratively polish Officials, Memorials, and Logs.

## 4. Execution Order
1.  **Update CSS Variables/Utilities**: Define the new look.
2.  **Refactor ConsoleLayout**: The central anchor.
3.  **Refactor DashboardLayout**: The main content container.
4.  **Refactor Sub-panels**: The content itself.
