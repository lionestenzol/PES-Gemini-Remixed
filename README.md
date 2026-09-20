# PES - Personal Execution System

PES is an end-to-end commitment execution, triage, and control system. It implements a guarded state lifecycle (`Captured`, `Ready`, `Scheduled`, `Active`, `Completed`, `Verified`, `Done`), strict single-active task limits, weekly capacity planning, and proof verification.

## Features

- **DropList Console**: Rapid, zero-friction cognitive holding bay for capturing thoughts, voice notes, and spontaneous sparks.
- **The Line**: AI-assisted prioritization and orchestration staging area to sequence incoming items.
- **PES Board & Views**: Full Kanban and filtered views (`Inbox`, `Ready`, `Active`, `Verify`, `Blocked`, `Records`).
- **Daily Queue & Active Task Enforcement**: Single active commitment execution bar with focus timer.
- **Weekly Capacity Planning**: Budgeting available hours against fixed commitments, meals, and recovery allocations.
- **PES V2 Transformation Pipeline**: 4-compartment compiler with visual node trees and BPMN 2.0 diagrams.
- **The Stuck Feature**: AI diagnostic and friction-rerouting tool for unblocking stalled tasks.
- **Universal PES Assistant**: Server-side conversational assistant powered by Google Gemini API.

## Architecture

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide icons, Motion animations.
- **Backend**: Express on Node.js 22, in-process deterministic PES engine and Path D solver.
- **AI Integration**: Server-side `@google/genai` with fallback heuristics when no key is configured.

## Running the App

```bash
npm run dev
```

The application runs on port 3000 (`0.0.0.0:3000`).

## Environment Variables

- `GEMINI_API_KEY`: (Optional) Google Gemini API key for AI-assisted triage, sorting, and diagnostic rerouting.
