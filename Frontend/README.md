# ClassConnect web app

React 18 + Vite single-page app for ClassConnect. See the [main README](../README.md) for the full project.

```bash
npm install
npm run dev       # http://localhost:5173 (proxies /api and /socket.io to http://localhost:5000)
npm test          # Vitest + React Testing Library
npm run lint
npm run build     # production build in dist/
```

## How it talks to the API

- `src/lib/api.js`: axios client. The access token lives in memory only. On a `401` the client calls `/api/auth/refresh` once (the refresh token is an `httpOnly` cookie), retries the request, and shares the refresh between parallel requests.
- `src/lib/socket.js`: one Socket.IO connection per session, authenticated with the current access token and reconnected with a fresh one after a refresh.
- `src/hooks/useSocket.js`: subscribe to socket events from components, with cleanup on unmount.
- `Components/AuthComponents/AuthContext.jsx`: restores the session on page load, handles the 2FA login step and logout.

In production the app is served by nginx (`nginx/default.conf.template`), which also proxies `/api` and `/socket.io` to the API container, so the browser only ever talks to one origin.
