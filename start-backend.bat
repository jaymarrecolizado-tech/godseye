@echo off
set NODE_ENV=development
set CORS_ORIGIN=http://localhost:5173
set DB_HOST=localhost
cd backend
node src/server.js
