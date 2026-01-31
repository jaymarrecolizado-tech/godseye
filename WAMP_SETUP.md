# Project Tracking Management System - WAMP Setup Guide

## Quick Start

This project is now configured to run with WAMP's MySQL database.

### Prerequisites
- WAMP Server (MySQL 9.1.0 is currently running)
- Node.js 18+ (v22.19.0 is currently installed)
- npm 9+ (v10.9.3 is currently installed)

### Running the Application

**Option 1: Start both servers (Recommended)**
```batch
start-all.bat
```

This will open two command windows - one for the backend and one for the frontend.

**Option 2: Start individually**

Start Backend API:
```batch
start-backend.bat
```

Start Frontend:
```batch
start-frontend.bat
```

### Access Points

Once running, access the application at:
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3001/api
- **Health Check:** http://localhost:3001/api/health

### Database

- **Database Name:** `project_tracking`
- **Host:** localhost (WAMP MySQL)
- **Port:** 3306
- **User:** root
- **Password:** (empty)

The database has been set up with the schema and seed data.

### Configuration

Environment files are located at:
- Backend: `backend/.env.local` (for local development)
- Frontend: `frontend/.env.local` (API URL configuration)

### Troubleshooting

**Backend shows "production" instead of "development":**
- Use `start-backend.bat` instead of running `node src/server.js` directly
- The batch file sets the correct environment variables

**CORS errors in browser:**
- Ensure both backend and frontend are running
- Check that CORS_ORIGIN in backend is set to `http://localhost:5173`

**Database connection errors:**
- Ensure WAMP MySQL service is running
- Check that database `project_tracking` exists
- Verify DB_HOST is set to `localhost`

**Port already in use:**
- Kill any existing Node.js processes using the ports
- Or modify PORT in the environment files

### API Endpoints

#### Authentication
- POST `/api/auth/login` - User login
- POST `/api/auth/register` - User registration

#### Projects (Protected - requires auth)
- GET `/api/projects` - List all projects
- GET `/api/projects/:id` - Get project by ID
- POST `/api/projects` - Create new project
- PUT `/api/projects/:id` - Update project
- DELETE `/api/projects/:id` - Delete project

#### Reports (Protected)
- GET `/api/reports/stats` - Dashboard statistics
- GET `/api/reports/summary/type` - Summary by project type
- GET `/api/reports/summary/status` - Summary by status

#### Import (Protected)
- POST `/api/import/upload` - Import CSV file
- GET `/api/import/template` - Download CSV template

### Default Users

Seed data includes test users. Check the `database/seeds/test_users.sql` file for credentials.

### Stopping the Servers

Close the command windows where the servers are running, or press Ctrl+C in each window.

### Development Notes

- Backend uses Express.js with MySQL2
- Frontend uses React 18 with Vite
- Real-time updates via Socket.io
- Maps via Leaflet
- Charts via Recharts
- State management via Zustand
