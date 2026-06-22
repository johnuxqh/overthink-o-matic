# Deployment Notes — V1 Private Test

OVERTHINK-O-MATIC V1 is a static mobile web app. It can be deployed anywhere that serves the built `dist/` folder.

## Recommended hosts

### Option A: Vercel

Good default for quick private testing.

1. Push the branch to GitHub.
2. Import the repository in Vercel.
3. Use the default Vite settings:
   - Install command: `npm install`
   - Build command: `npm run build`
   - Output directory: `dist`
4. Deploy and share the generated Vercel URL with Shelley.

### Option B: GitHub Pages

Good if the project should stay close to the repository.

1. Run `npm run build` locally or in a GitHub Actions workflow.
2. Publish the generated `dist/` directory to GitHub Pages.
3. If deploying under a subpath, configure Vite's `base` path before building.
4. Share the GitHub Pages URL with Shelley.

## Pre-deploy checklist

Run these before sharing the URL:

```bash
npm run typecheck
npm test
npm run build
```

Then smoke-test the deployed URL on a phone-sized viewport:

- Setup works for a new visitor.
- Returning visitor data hydrates from local storage.
- A decision can be locked, played, accepted, and shared.
- The fifth game attempt triggers Sudden Death.
- Lockdown survives reload.
- Screenshot/share fallback text is visible when image download is unsupported.

## Mobile home screen note

V1 is mobile web. Shelley can open it in a mobile browser and use the browser's **Add to Home Screen** / **Save to Home Screen** option for quick access during private testing.

## Operational limitations

- Data is stored only in the current browser's local storage.
- Clearing browser data removes saved setup, active decisions, and previous overthinks.
- There is no backend, login, syncing, analytics, or social posting integration in V1.
