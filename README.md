# AceTheApp

AceTheApp is a MERN-style project with an Express/Mongo backend and a Vite/React frontend. This repo contains:

- `backend/` – API server, authentication, OpenAI-powered features.
- `andrew_internship_work/` – Vite + React client.
- Supporting data files (essay prompts, slug map, etc.).

## Prerequisites

- Node.js 18+ and npm.
- A running MongoDB instance reachable from your dev machine.
- Google Cloud OAuth credentials (Web client) and Google Docs/Drive API access for document creation.
- An OpenAI API key if you plan to exercise the AI endpoints.

## Configuration

1. Create `backend/.env` from the provided example:
   ```bash
   cp backend/.env.example backend/.env
   ```
   Fill in:
   - `MONGO_URI` – Mongo connection string.
   - `SESSION_SECRET` / `JWT_SECRET` – random strings for cookies/JWTs.
   - `FRONTEND_ORIGIN` – usually `http://localhost:5173`.
   - Google OAuth credentials plus `GOOGLE_CALLBACK_URL` (defaults to `http://localhost:5001/api/auth/google/callback`).
   - `OPENAI_API_KEY` – only required for the AI generation routes.

2. Create `andrew_internship_work/.env` from its example:
   ```bash
   cp andrew_internship_work/.env.example andrew_internship_work/.env
   ```
   - Keep `VITE_API_URL` pointing to your backend (e.g., `http://localhost:5001/api`).
   - Reuse the same Google OAuth client ID and a Google API key that has Docs/Drive enabled.

## Install dependencies

From the repo root:

```bash
cd backend && npm install
cd ../andrew_internship_work && npm install
```

## Running locally

1. Start the backend API (port defaults to 5001):
   ```bash
   cd backend
   npm start
   ```
2. In a second terminal, start the React dev server (Vite defaults to port 5173):
   ```bash
   cd andrew_internship_work
   npm run dev -- --host
   ```

Visit `http://localhost:5173` in your browser once both servers are up. Ensure the values in both `.env` files stay in sync so CORS, OAuth, and API calls succeed.
