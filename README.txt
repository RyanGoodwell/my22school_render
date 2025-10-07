MY22SCHOOL - full package (minimal frontend + backend)

Structure:
- backend/  -> Node.js + Express + SQLite3 server (server.js)
- frontend/ -> Minimal React app (src/, public/)

Important:
- This archive does NOT include installed node_modules. Run `npm install` in each folder before starting.
- Backend uses SQLite at /tmp/my22school.db by default (suitable for Render ephemeral storage).
- Set environment variables in backend/.env (PORT, JWT_SECRET, SQLITE_PATH).
- For frontend, update src/constants.js or .env REACT_APP_API_URL to point to deployed backend.

Run locally:

# Backend
cd backend
npm install
npm start

# Frontend
cd frontend
npm install
npm start

Deploy to Render:
- Create two services: Web Service (backend) and Static Site (frontend build).
- For backend set start command: `npm start`, build env as Node.
- For frontend set build command: `npm run build` and publish directory `build`.
- Update frontend to use backend URL (REACT_APP_API_URL or src/constants.js).

