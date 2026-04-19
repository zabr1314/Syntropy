# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.5.0] - 2026-04-19

### 🎯 Theme: Harness — Agent Harness for Production-Ready Multi-Agent Systems

This release reframes Syntropy around the **Harness** philosophy: it's not about how powerful a single model is, but how you tie models, tools, context, and feedback loops together to turn agents from chatbots into reliable, deliverable systems.

### Added

- **`harness/` — Complete Hackathon Submission Package**
  - `项目介绍.md` — Production-ready README for judges, centered on the Harness narrative
  - `核心理念.md` — Deep dive into the three-layer Harness architecture (Reins / Saddle / Stable)
  - `路演文稿.md` — 3-minute pitch script with elevator pitch, differentiation table, and demo scenario
  - `演示脚本.md` — Minute-by-minute demo script ("Build a Reservoir in Jiangnan") with contingency plans
  - `架构设计.md` — Full technical architecture from a Harness perspective, including Mermaid data-flow diagrams, security model, and extensibility design

### Documentation

- Reframed project narrative from "ancient court metaphor" to **"Agent Harness Operating System"**
- Added 10-dimension comparison: Unharnessed Agent vs Harnessed Agent
- Documented 16 core technical implementations with precise file-path references
- Aligned with Anthropic's Harness Design principles for long-running agentic applications

---

## [2.4.0] - 2026-03-16

### Added

- **LLM-Driven Active Memory** — Agents autonomously decide what to remember via `save_memory` skill
- **Memory Deduplication** — `MemoryManager.save()` automatically detects duplicate content
- **Heuristic Auto-Capture** — `Agent.execute()` captures user preferences without rule maintenance
- **Context Safe Pruning** — `ContextManager.pruneContext()` protects tool_call/tool_result pairs as atomic units
- **Dispatch Timeout Guard** — 60s `Promise.race` timeout on `Kernel.dispatch()` prevents indefinite hangs
- **`Promise.allSettled` Parallel Dispatch** — `call_officials` isolates single-point failures
- **Session SQLite Persistence** — `SessionStore` replaces JSONL with indexed SQLite
- **Structured Observability (`Tracer`)** — traceId propagation, 8 diagnostic events, log redaction, 3-min stuck detection
- **SocketGateway Routing Unification** — Complete decoupling of Socket.io from Kernel

### Changed

- `Kernel` constructor no longer receives `io`; pure scheduling logic
- `handleCommand()` now accepts `traceId` from socket entry
- Expanded test suite to 31 cases, all passing

---

## [2.3.0] - 2026-03-13

### Added

- **Human-in-the-Loop Approval Flow** — `WAITING_FOR_HUMAN` state with `ApprovalModal` (御批弹窗)
- **Memory Debugger** — Frontend RAG retrieval visualization (FTS + Vector weight distribution)
- **Memory Compression** — `onSleep` hook triggers LLM summary generation for daily archives
- **Imperial Style UI** — Royal classical styling for Internal Affairs panel
- **Skin Persistence** — Custom agent skins survive page refresh
- **Optimistic UI** — Agent deletion reflects immediately without confirmation modal
- **Ghost Data Cleanup** — Auto-removes deleted agents from Phaser scene
- **Emperor Protection** — Core "Emperor" role always present even if config is empty
- **Frontend Testing** — Vitest + @testing-library/react suite for `LiveAgentService`

### Fixed

- Duplicate `LiveAgentService.start()/stop()` calls removed
- Decree completion debounced by 2s to prevent false positives during tool-call gaps

---

## [2.2.0] - 2026-03-12

### Added

- **ACP (Agent Collaboration Protocol)** — Structured inter-agent messaging via `Kernel.dispatch()`
- **Config Hot Reload** — Runtime updates to Prompt/Model/Skill without restart
- **File Management System** — Per-agent workspace with upload/list/delete APIs
- **Risk-Level Tool System** — Low/Medium/High classification with automatic approval routing
- **Embedding Service** — OpenAI Embedding wrapper with caching
- **RRF Hybrid Retrieval** — FTS5 + Vector Cosine + Reciprocal Rank Fusion
- **`AgentState` State Machine** — `INITIALIZING → IDLE → THINKING → ACTING → SLEEPING → ERROR`
- **`ContextManager`** — Token-budget-aware context window management

---

## [2.1.0] - 2026-03-10

### Added

- **Multi-Agent Parallel Dispatch** — `call_officials` skill for concurrent sub-agent execution
- **Official Status Bubbles** — Phaser-rendered `THINKING`/`WORKING` indicators above agents
- **Stream Buffering** — Real-time LLM output streaming via Socket.io

---

## [2.0.0] - 2026-03-08

### Added

- **Project renamed to Syntropy (太和)**
- **React + Phaser 3 Bridge** — Zustand-powered real-time state synchronization
- **Socket.io Real-Time Communication** — Bidirectional events for state push and command dispatch
- **8 AI Officials** — Minister, Historian, Revenue, War, Works, Rites, Personnel, Justice
- **Grand Council Console** — OfficialsPanel, MemorialsPanel, MemoryVault, LogSidebar
- **Decree Pipeline** — Visual task lifecycle: Draft → Planned → Execution → Completed

---

## [1.0.0] - 2026-03-01

### Added

- Initial release: AI Empire Digital Hub MVP
- Basic agent management and chat interface
