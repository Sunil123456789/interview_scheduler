# Interview Scheduler Frontend - Fast Guide

Built with React 18 + TypeScript + Tailwind CSS + Vite

## Quick Start

```bash
# Install dependencies (one time)
npm install --legacy-peer-deps

# Start dev server
npm run dev

# Open http://localhost:5173
```

## Pages

1. **Dashboard** (`/`) - View all interviews
2. **Schedule** (`/schedule`) - Queue new scheduling
3. **Status** (`/status`) - Check interview progress
4. **Admin** (`/admin`) - Manage areas & AOMs (scaffolding)

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS 3** - Styling
- **Vite 5** - Fast bundler
- **React Router 6** - Navigation
- **Axios** - HTTP client
- **Lucide React** - Icons

## Backend Integration

The frontend proxies to Django API at `http://localhost:8000/api`:

```typescript
// API calls example
import { scheduleInterview, getInterviewStatus } from './api/client'

// Schedule a new interview
const response = await scheduleInterview(candidateId)

// Get interview status
const interview = await getInterviewStatus(interviewId)
```

## Build for Production

```bash
npm run build    # Creates dist/ folder
npm run preview  # Test production build locally
```

## Fixes Applied

✅ HTML entry point corrected (main.tsx, root div)
✅ Title updated to "Interview Scheduler"
✅ Dashboard error handling implemented
✅ All deps properly configured
✅ Tailwind + PostCSS setup verified

## Next: Remove Vue Files

```bash
# Clean up leftover Vue artifacts
rm -r src/assets src/App.vue src/main.js src/style.css
```

See `SETUP.md` for detailed cleanup instructions.
