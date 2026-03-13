# 天命系统 (Destiny System) Project Improvement Plan

Based on the comparison with `cft0808/edict` (OpenClaw Multi-Agent Orchestration System), this plan outlines strategic improvements to elevate "天命系统" from a visual demo to a robust, interactive agent orchestration platform.

## 1. Core Mechanics: Deepening the "Three Departments" Logic

Currently, the `Chancellery` (门下省) simply mocks a rejection on the first attempt. To match `edict`'s "institutional review" capability:

* [x] **Implement Real "Chancellery" Review Logic**

  * Replace the simple counter-based rejection with a rule-based or LLM-based critique.

  * **Feature**: "Auto-Critique" - The Chancellery Agent analyzes the plan for missing steps (e.g., "Security Check", "Tests") and rejects if absent.

  * **Feature**: "Human-in-the-Loop" - Allow the User (Emperor) to intervene during the review phase, manually approving or rejecting the plan with feedback.

* [x] **Enhance "Secretariat" (中书省) Planning**

  * Improve the mock planner to generate more complex, multi-step plans based on the user's input, rather than static templates.

  * Allow the Secretariat to "learn" from Chancellery feedback (e.g., if rejected for missing tests, the next plan *must* include tests).

## 2. System Expansion: Completing the "Six Ministries"

`edict` has a full 12-agent structure. "天命系统" currently focuses on the Ministry of War. We need to flesh out the others:

* [x] **Ministry of Personnel (吏部)**

  * **Role**: Agent Health & Status Monitor.

  * **Feature**: "Roll Call" (点卯) - A dashboard showing active agents, their current status (Idle, Working, Offline), and "mood" (simulated health).

* [x] **Ministry of Justice (刑部)**

  * **Role**: Security & Audit.

  * **Feature**: "Decree Audit" - A post-execution check. Did the output match the requirements? (Can be simulated or real regex checks on output).

* [x] **Ministry of Works (工部)**

  * **Role**: Infrastructure & Deployment.

  * **Feature**: Visualizing "Deployment" tasks (e.g., progress bars for "Building", "Deploying").

* [x] **Ministry of Revenue (户部)**

  * **Role**: Resource Management.

  * **Feature**: Track "Token Usage" or "Budget" for each decree.

## 3. Dashboard Enhancement: "Court Console" Upgrade

`edict` features a comprehensive dashboard (Kanban, Memorials, etc.). "天命系统" can improve its Console:

* [x] **"Memorials" (奏折阁) - Archives**

  * **Feature**: A history view of all past decrees.

  * **Detail**: Click to see the full lifecycle: Request -> Plan -> Review (and Rejections) -> Execution -> Result.

* [x] **"Officials" (官员总览) - Statistics**

  * **Feature**: A stats panel showing:

    * Tasks Completed per Ministry.

    * "Loyalty" or "Efficiency" scores (simulated metrics).

* [ ] **"Skill Library" (技能库)**

  * **Feature**: A view showing what capabilities each Agent currently possesses (e.g., "Python", "React", "Docker").

## 4. Control & Intervention: "Imperial Authority"

`edict` allows pausing and cancelling tasks. This is crucial for control.

* [x] **Decree Control**

  * **Feature**: "Recall Decree" (追回圣旨) - Cancel a running task.

  * **Feature**: "Pause Execution" (暂停) - Halt the current step (useful for debugging or reading logs).

* [ ] **Emergency Protocols**

  * **Feature**: "Lockdown" (戒严) - Pause all agents and return them to their stations (already partially in `EmergencyService`, need UI integration).

## 5. Visual Polish: Leveraging the "Game" Identity

"天命系统" has a unique advantage over `edict`: the pixel-art game interface. We should double down on this.

* [ ] **"Morning Court" (早朝) Ritual**

  * **Visual**: Agents gather in the main hall at the start of a session or periodically.

* [ ] **Interactive Animations**

  * **Rejection**: Visual animation of the Chancellery agent throwing a scroll back to the Secretariat.

  * **Execution**: Specific particle effects for different ministries (e.g., binary code for War, coins for Revenue).

## 6. Technical Integration

* [ ] **Real Backend Integration**

  * Move beyond `state.json` watching. Implement a WebSocket or HTTP API to allow real bi-directional communication with an agent backend (OpenClaw or custom Python backend).

