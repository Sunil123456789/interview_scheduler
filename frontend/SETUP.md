# Frontend Cleanup & Setup Guide

## Remove Vue Remnants

Remove these leftover Vue files:

```powershell
# From frontend/ directory
rm -r assets
rm src/App.vue
rm src/main.js
rm src/style.css
```

## Setup Environment

Create `.env.local` file:

```bash
VITE_API_URL=http://localhost:8000/api
```

## Clean Install

```powershell
cd frontend
rm -r node_modules package-lock.json
npm install --legacy-peer-deps
npm run dev
```

## What's Fixed

✅ **index.html** - Now points to `main.tsx` with correct root div ID
✅ **package.json** - React 18 + TypeScript properly configured
✅ **Dashboard** - Error handling and proper fetch structure ready
✅ **Build Config** - Vite + Tailwind v3 + PostCSS properly configured
✅ **API Client** - Axios configured with proxy support via Vite

## Next Steps

1. **Backend Endpoint** - Add GET endpoint to list interviews (not yet implemented in Django API)
   
   ```python
   # scheduler/views.py - Add this view
   class InterviewsListView(APIView):
       def get(self, request):
           interviews = Interview.objects.all().values(...)
           return Response(interviews)
   ```

2. **Start Frontend**:
   ```powershell
   npm run dev
   ```

3. **Frontend URL**: http://localhost:5173

## Troubleshooting

- **Module not found errors**: Delete `node_modules` and reinstall
- **Tailwind not working**: Check `tailwind.config.js` content includes `./src/**/*.{js,ts,jsx,tsx}`
- **API proxy issues**: Ensure Django is running on port 8000
