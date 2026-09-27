# Hosting & Deployment Guide - TET Mock Exam Platform

This platform is configured as a **ready-to-host web application**. The FastAPI backend automatically serves both the API and the React single-page frontend from a single port, eliminating CORS issues and keeping hosting free and straightforward.

---

## Method 1: 1-Click Free Hosting on Render (Recommended)

Render offers free hosting for web services and automatically builds both the frontend and backend.

### Step 1: Push your code to GitHub
```bash
git init
git add .
git commit -m "Initial commit of TET mock exam platform"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo-name>.git
git push -u origin main
```

### Step 2: Deploy on Render
1. Go to [render.com](https://render.com) and sign in with GitHub.
2. Click **New +** &rarr; **Web Service**.
3. Select your GitHub repository.
4. Configure the service:
   - **Name**: `tet-mock-exam-platform`
   - **Environment**: `Python 3`
   - **Branch**: `main`
   - **Root Directory**: leave blank (or `mock-exam-platform`)
   - **Build Command**:
     ```bash
     cd frontend && npm install && npm run build && cd ../backend && pip install -r requirements.txt
     ```
   - **Start Command**:
     ```bash
     cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT
     ```
   - **Instance Type**: **Free**
5. Add Environment Variables (under Advanced / Environment):
   - `DATABASE_URL`: `sqlite:///./exam_platform.db` (or your PostgreSQL / MongoDB connection string)
   - `JWT_SECRET`: (enter any random secret string, e.g. `secret-key-tet-2026`)
6. Click **Deploy Web Service**. Render will build the app and give you a live HTTPS URL (e.g. `https://tet-mock-exam.onrender.com`).

---

## Method 2: Frontend on Vercel + Backend on Render / Railway

If you want the frontend delivered over Vercel's global edge CDN:

### Part A: Deploy Backend on Render / Railway
1. Create a Web Service pointing to the `backend/` folder.
2. Build Command: `pip install -r requirements.txt`
3. Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Copy your live backend URL (e.g. `https://my-tet-backend.onrender.com`).

### Part B: Deploy Frontend on Vercel
1. In [`frontend/vercel.json`](file:///Users/abrarahammad/Desktop/tet/mock-exam-platform/frontend/vercel.json), replace:
   ```json
   "destination": "https://my-tet-backend.onrender.com/api/$1"
   ```
2. In Vercel, click **Add New** &rarr; **Project** &rarr; select repo.
3. Set **Root Directory** to `frontend`.
4. Framework Preset: **Vite**.
5. Click **Deploy**. Vercel will host the frontend and proxy all `/api/*` calls seamlessly.

---

## Method 3: Deploy with Docker / VPS (DigitalOcean, AWS, Linode)

If you have a Linux VPS or cloud server with Docker installed:

1. Clone your repo on the server:
   ```bash
   git clone https://github.com/<your-username>/<your-repo-name>.git
   cd mock-exam-platform
   ```
2. Start the container with Docker Compose:
   ```bash
   docker compose up -d --build
   ```
3. Your platform will be running on port `8000` with data persistently stored in `./data_storage`.
4. (Optional) Set up Nginx or Caddy with Let's Encrypt for automatic HTTPS:
   ```caddy
   yourdomain.com {
       reverse_proxy 127.0.0.1:8000
   }
   ```

---

## Connecting External Databases (MongoDB or PostgreSQL)

The platform defaults to zero-setup **SQLite** ([`exam_platform.db`](file:///Users/abrarahammad/Desktop/tet/mock-exam-platform/backend/exam_platform.db)). If you want to use cloud database providers:

### PostgreSQL (Supabase, Neon, Render Postgres)
Set the environment variable:
```bash
DATABASE_URL=postgresql://user:password@ep-host.pooler.supabase.com:5432/dbname
```
SQLAlchemy will automatically use PostgreSQL with no code changes needed.

### MongoDB
Set the environment variable:
```bash
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/exam_platform?retryWrites=true&w=majority
```
