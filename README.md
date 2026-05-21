# Backy

Backy is a rapid backend development platform designed to help developers build, manage, and deploy backend services with a visual designer and integrated code editor. It generates standard TypeScript code using Bun, ElysiaJS, and Drizzle ORM, ensuring no vendor lock-in.

## Core Features

- Visual API Designer: Create ElysiaJS routes with TypeBox validation using a drag-and-drop interface.
- Logic Blocks: Define reusable logic functions in TypeScript that can be chained between endpoints.
- Database Modeling: Design SQLite schemas visually with Drizzle ORM and sync changes with a single click.
- Visual Logic Chaining: Wire nodes together to automatically generate pipeline code.
- Integrated Terminal: Install npm packages and monitor server logs directly from the browser.
- Git Integration: Version control support with auto-commit capabilities.
- Modern UI: Clean, minimalist interface built with React and Tailwind CSS.

## Tech Stack

- Runtime: Bun
- Framework: ElysiaJS
- ORM: Drizzle ORM
- Frontend: React, Tailwind CSS, Vite
- Database: SQLite

## Getting Started

### Prerequisites

- Bun installed on your machine.

### Installation

1. Clone the repository.
2. Install dependencies:
   ```bash
   bun install
   ```

### Development

To start both the server and the client in development mode:

```bash
bun dev
```

The application will be available at http://localhost:3000.

## Project Structure

- packages/client: React frontend application.
- packages/server: Bun server handling metadata and code generation.
- packages/template: The base template used when creating new backend projects.
- projects/: Directory where your backend applications are stored.

## Code Generation

Backy generates clean, human-readable TypeScript code. You can find your project source code in the `projects/[project-name]` directory. You can eject at any time by simply copying that folder and running it as a standard Bun project.

## License

MIT
