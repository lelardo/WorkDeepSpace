# WORK**DEEP**SPACE

**WorkDeepSpace** is a modular, browser-based productivity command deck designed for deep work. It allows developers to build a personalized workspace by assembling functional "blocks" (modules) onto a synchronized grid, simulating a mission control center for software engineering.

## The Concept: "Mission-Ready Modularity"

The application functions as a high-performance "base-plate." Users don't just use an app; they **assemble** their workspace.
* **Custom Modules**: Droppable React components that act as independent tools.
* **Flexible Layout**: A split-panel dashboard with resizable containers and floating overlay widgets.
* **Architecture**: Designed to be local-first, where the user maintains sovereignty over their data.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite.
- **Styling**: Zero-library approach. All UI is built using a custom Token System (`ms`) and CSS variables for instant theme switching.
- **State Management**: Custom singleton stores using `useSyncExternalStore` for reactive, high-performance UI updates.
- **Persistence Layer**: Built with a "Bring Your Own Database" philosophy. While currently running in-browser for development, the architecture is prepared for private, user-provided SQL instances to ensure data privacy and portability.

## Core Modules & Widgets

| Feature | Type | Description |
|:--- |:--- |:--- |
| **Kanban** | Module | Three-column task management with drag-and-drop workflow. |
| **Sprint Board** | Module | Agile backlog management with Fibonacci points and burn-down indicators. |
| **Roadmap** | Module | Gantt-style timeline with draggable and resizable epic bars across years. |
| **Chat** | Widget | Integrated team communication with unread notifications and polling. |
| **Notes** | Widget | Markdown-ready private editor with color-coded labeling. |

## Adding Your Own "Blocks"

The workspace is designed to be extended by developers.

### 1. Create a Module
New modules can be added by creating a single folder in `src/modules/`. Each module requires a descriptor defining its icon, name, and default layout constraints (columns/rows).

### 2. Floating Widgets
Overlay widgets (FABs) can be registered to sit on top of the workspace. They include built-in logic for snapping to corners and persistence of panel states (open/closed).

## Data Sovereignty

Unlike traditional SaaS, **WorkDeepSpace** does not rely on a centralized backend.
1. **Private by Design**: Data is processed locally.
2. **Flexible SQL**: The system uses an injection pattern where the database instance is passed as a prop to every module. 
3. **Portability**: Users are intended to provide their own SQL storage, keeping their work history private and under their direct control.

## Getting Started

```bash
# Clone the mission control
git clone [https://github.com/your-repo/workdeepspace.git](https://github.com/your-repo/workdeepspace.git)

# Install dependencies
npm install

# Launch the deck
npm run dev
