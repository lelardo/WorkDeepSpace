# WORK**DEEP**SPACE

**WorkDeepSpace** is a modular, browser-based productivity command deck designed for deep work and high-performance engineering. It allows developers to build a personalized workspace by assembling functional "blocks" (modules) onto a synchronized grid, simulating a mission control center for software development.

## AI-Augmented Engineering

This project is built with a "Machine-Partner" philosophy. **WorkDeepSpace** is designed to be developed and extended using AI:
* **Co-Created with AI**: The core architecture and modules are the result of a collaborative process between human intuition and Artificial Intelligence.
* **AI-Ready Modules**: The codebase is structured to be easily understood and extended by Large Language Models (LLMs).
* **Instruction-Based Scaling**: The included `quickstart.md` provides a concise, standardized set of instructions that allow any AI model to generate fully compatible modules from scratch.

## The Concept: "Mission-Ready Modularity"

The application functions as a high-performance "base-plate." Users don't just use an app; they **assemble** their mission control.
* **Live Coding Optimized**: Designed for real-time iteration. The modular structure allows for hot-swapping logic and UI during live development sessions.
* **Custom Blocks**: Droppable React components that act as independent tools.
* **Flexible Layout**: A split-panel dashboard with resizable containers and floating overlay widgets.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite.
- **Styling**: Zero-library approach. All UI uses a custom Token System (`ms`) and CSS variables for instant theme switching.
- **State Management**: Custom singleton stores using `useSyncExternalStore` for reactive UI updates.
- **Persistence Layer**: Built with a "Bring Your Own Database" philosophy. While running in-browser for development, the architecture is prepared for private, user-provided SQL instances.

## Core Modules & Widgets

| Feature | Type | Description |
|:--- |:--- |:--- |
| **Kanban** | Module | Three-column task management with drag-and-drop workflow. |
| **Sprint Board** | Module | Agile backlog management with Fibonacci points and burn-down indicators. |
| **Roadmap** | Module | Gantt-style timeline with draggable and resizable epic bars. |
| **Chat** | Widget | Integrated team communication with unread notifications. |
| **Notes** | Widget | Markdown-ready private editor with color-coded labeling. |

## Data Sovereignty

Unlike traditional SaaS, **WorkDeepSpace** does not rely on a centralized backend.
1. **Private by Design**: Data is processed locally.
2. **Flexible SQL**: The database instance is injected as a prop to every module. 
3. **Portability**: Users are intended to provide their own SQL storage, keeping their work history private and under their direct control.

## Getting Started

```bash
# Clone the mission control
git clone [https://github.com/your-repo/workdeepspace.git](https://github.com/your-repo/workdeepspace.git)

# Install dependencies
npm install

# Launch the deck
npm run dev
