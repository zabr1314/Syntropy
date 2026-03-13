# UI Theme Overhaul Plan: Imperial Court Style

## Goal
Transform the current modern/tech UI into an "Imperial Court" (Cyber-Imperial) style suitable for an Emperor governing via the "Mandate of Heaven" system. The design will leverage the existing Pixel Art font to create a unique **Pixel-Imperial** aesthetic.

## Design Philosophy
- **Palette**: Shift from Cool Blue/Cyan/Gray to **Vermilion (朱红)**, **Imperial Gold (明黄)**, **Ink Black (玄色)**, and **Jade Green (青玉)**.
- **Textures**: Simulate wood, paper (xuanzhi), and bronze materials using CSS colors and borders.
- **Shapes**: Use "Tablets" (令牌), "Scrolls" (卷轴), and "Seals" (印章) as visual metaphors.

## Task Breakdown

### 1. Global Theme Configuration (`src/index.css`)
- Define CSS variables for the Imperial Palette.
- Add utility classes for "Imperial Borders" (Double gold lines on dark red background).
- Add utility classes for "Scroll Backgrounds" (Paper texture color).

### 2. Console Layout (The Dragon Desk) (`src/components/Console/ConsoleLayout.tsx`)
- **Container**: Transform the bottom bar into a "Dragon Desk" (御案).
  - Background: Deep wood/red color (`bg-red-950` variant).
  - Border: Top border with gold trim.
  - Layout: Maintain the 3-column structure but add decorative separators (cloud patterns).

### 3. Department Dock (The Six Ministries) (`src/components/Console/DepartmentDock.tsx`)
- **Agent Icons**:
  - Change generic rounded buttons to **Spirit Tablets (牌位/令牌)** or **Jade Tokens** shapes.
  - Active/Working state: Glow with a "Spirit Fire" (soul-like) effect instead of a simple ring.
  - Tooltips: Style as mini "Memorials" (奏折).

### 4. Decree Pipeline (The Edict) (`src/components/Console/DecreePipeline.tsx`)
- **Input Area**: Style as a **Blank Decree (圣旨)**.
  - Background: Pale yellow/beige (Rice paper color).
  - Text: Dark ink color.
  - Placeholder: "Drafting an Edict..." (拟旨...).
- **Progress Bar**:
  - Instead of a pill shape, use a **Horizontal Scroll** metaphor.
  - Stages (Drafting -> Executing) represented by **Red Seals (印章)** stamping on the scroll.

### 5. Metrics Panel (National Fortune) (`src/components/Console/MetricsPanel.tsx`)
- **Metrics**:
  - Style each metric (CPU, Users, Tickets) as a **Wooden Plaque (木牌)** hanging on the desk.
  - Icons: Keep Lucide icons but color them gold/bronze.
  - Labels: Use vertical text layout if possible, or classic horizontal with archaic font weight.
- **Controls**:
  - Log button: A stack of books/scrolls icon.
  - Emergency button: A **War Drum (战鼓)** or **Dragon Pearl** style.

### 6. Log Sidebar (The Archives) (`src/components/Console/LogSidebar.tsx`)
- **Container**: Style as an opened **Bamboo Slip (竹简)** or **Memorial (奏折)**.
- **List Items**: Separate entries with horizontal lines resembling bamboo slip ties.
- **Typography**: Enhance readability with high contrast (Ink on Bamboo/Paper).

## Execution Steps
1.  **Update Global CSS**: Add imperial colors and border utilities.
2.  **Refactor ConsoleLayout**: Apply the "Dragon Desk" background.
3.  **Refactor DecreePipeline**: Implement the Scroll and Seal visual.
4.  **Refactor DepartmentDock**: Implement the Token/Tablet visual.
5.  **Refactor MetricsPanel**: Implement the Plaque visual.
6.  **Refactor LogSidebar**: Implement the Memorial visual.
