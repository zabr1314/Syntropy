# Plan: Department Dock Redesign

The user finds the current `DepartmentDock` (the left section of the console) cluttered, ugly, and hard to use.
We will redesign it to match the new "Neo-Imperial" aesthetic, focusing on clarity, hierarchy, and visual polish.

## 1. Design Concept: "Jade & Gold Command Bar"

We will move away from the "skeuomorphic wooden tablets" to a cleaner, glass-morphism + jade token design.

### A. Separation of Concerns
Currently, action buttons (Meeting/Views) and status indicators (Officials) are mixed visually. We will separate them into two distinct groups:
1.  **Command Group (Left)**: Large, interactive buttons for global actions.
2.  **Cabinet Group (Right)**: Compact status indicators for the officials.

### B. Visual Style
-   **Command Buttons**: 
    -   Style: Rectangular with cut corners or slight rounding.
    -   Material: Dark glass background with Gold borders (`border-imperial-gold`).
    -   State: Glows when active/hovered.
-   **Official Tokens**:
    -   Style: Circular "Jade Tokens".
    -   Material: Dark background, colored border indicating status.
    -   Status: 
        -   Idle: Dim/Jade border.
        -   Working: Glowing Blue/Gold border + Pulse.
        -   Error: Red border + Shake.

## 2. Implementation Steps

### Refactor `src/components/Console/DepartmentDock.tsx`

1.  **Layout Container**:
    -   Change from a simple `flex` row to a container with two distinct sections separated by a vertical divider.

2.  **Section 1: The Commands**:
    -   **Morning Court (朝会)**:
        -   Icon: `Users` or `Bell` (Lucide).
        -   Action: Toggles Meeting Mode.
        -   Visual: Gold/Red theme.
    -   **Archives (奏折)**:
        -   Icon: `ScrollText` (Lucide).
        -   Action: Scrolls to Memorials Panel.
        -   Visual: Gold/Blue theme.
    -   **Roster (点卯)**:
        -   Icon: `ClipboardList` (Lucide).
        -   Action: Scrolls to Officials Panel.
        -   Visual: Gold/Green theme.

3.  **Section 2: The Cabinet (Six Ministries)**:
    -   Render the 8 officials (Emperor/Minister/6 Ministries) as a compact row of circular tokens.
    -   **Token Design**:
        -   Size: `w-10 h-10` (smaller than before).
        -   Content: Role Icon centered.
        -   Tooltip: Keep the existing detailed tooltip but styled to match the new theme.

4.  **Animations**:
    -   Add `framer-motion` for hover effects and status changes.

## 3. Deliverables
-   A cleaner, more organized dock.
-   Better visual feedback for "Working" states.
-   Clearer distinction between "clicking to view info" and "clicking to trigger game event".
