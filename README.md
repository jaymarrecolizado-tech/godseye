# Project Tracking Management System

A comprehensive full-stack web application for tracking and managing government projects across different regions. Built with React, Express.js, and MySQL.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)
![MySQL](https://img.shields.io/badge/MySQL-8.0-orange.svg)

## 📋 Table of Contents

- [Features](#features)
- [System Architecture](#system-architecture)
- [Technology Stack](#technology-stack)
- [Prerequisites](#prerequisites)
- [Quick Start Guide](#quick-start-guide)
- [Directory Structure](#directory-structure)
- [API Documentation](#api-documentation)
- [Available Scripts](#available-scripts)
- [Environment Variables](#environment-variables)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## ✨ Features

### Core Features
- 📊 **Dashboard** - Overview with statistics, charts, and recent projects
- 🗺️ **Interactive Map** - Visualize projects on an interactive map with clustering
- 📋 **Project Management** - CRUD operations for project tracking
- 📁 **CSV Import** - Bulk import projects via CSV files with validation
- 📈 **Reports & Analytics** - Generate summaries and export data
- 🔍 **Advanced Filtering** - Filter by location, status, type, and date range
- 📍 **Geospatial Search** - Find projects within bounds or near a location

### Technical Features
- ⚡ Real-time updates via WebSocket
- 📱 Responsive design for mobile and desktop
- 🔒 Input validation and error handling
- 🐳 Docker containerization support
- 🔄 Automated database seeding
- 📤 File upload with progress tracking

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Client (Browser)                        │
│              React + Vite + Tailwind CSS                     │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP / WebSocket
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Port 3000)                      │
│              React SPA served by Nginx                       │
└────────────────────────┬────────────────────────────────────┘
                         │ API Requests
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Port 3001)                       │
│              Express.js + Socket.io                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │ Projects │ │Geospatial│ │  Import  │ │ Reports  │        │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
└────────────────────────┬────────────────────────────────────┘
                         │ MySQL Protocol
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Database (Port 3306)                      │
│              MySQL 8.0                                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │ projects │ │locations │ │provinces │ │municipal │        │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
└─────────────────────────────────────────────────────────────┘
```

## 🛠️ Technology Stack

### Frontend
- **React 18** - UI library
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **Tailwind CSS** - Utility-first CSS framework
- **Axios** - HTTP client
- **Socket.io Client** - Real-time communication
- **Leaflet** - Interactive maps
- **Recharts** - Data visualization
- **Zustand** - State management

### Backend
- **Node.js 18** - Runtime environment
- **Express.js** - Web framework
- **Socket.io** - Real-time bidirectional communication
- **MySQL2** - Database driver
- **Multer** - File upload handling
- **CSV-Parse** - CSV parsing
- **CORS** - Cross-origin resource sharing
- **Dotenv** - Environment variable management

### Database
- **MySQL 8.0** - Relational database
- **Spatial Extensions** - Geospatial data support

### DevOps
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration
- **Nginx** - Web server and reverse proxy

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **MySQL** (v8.0 or higher) - [Download](https://dev.mysql.com/downloads/)
- **npm** (v9 or higher) - Comes with Node.js
- **Git** - [Download](https://git-scm.com/)

### Optional (for Docker deployment)
- **Docker** - [Download](https://docs.docker.com/get-docker/)
- **Docker Compose** - [Download](https://docs.docker.com/compose/install/)

## 🚀 Quick Start Guide

### Option 1: Automated Setup (Recommended)

#### Windows
```batch
setup.bat
```

#### Linux/Mac
```bash
chmod +x setup.sh
./setup.sh
```

### Option 2: Manual Setup

#### Step 1: Database Setup

1. Create the database:
```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS project_tracking CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

2. Run the schema:
```bash
cd database
mysql -u root -p project_tracking < schema.sql
```

3. Seed the database:
```bash
cd seeds
cat *.sql | mysql -u root -p project_tracking
```

#### Step 2: Backend Setup

1. Install dependencies:
```bash
cd backend
npm install
```

2. Configure environment:
```bash
copy .env.example .env
# Edit .env with your database credentials
```

3. Start the server:
```bash
npm run dev
```

The backend will start on http://localhost:3001

#### Step 3: Frontend Setup

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Configure environment:
```bash
copy .env.example .env.local
# Edit .env.local with your API URL (default: http://localhost:3001/api)
```

3. Start the dev server:
```bash
npm run dev
```

The frontend will start on http://localhost:3000

### Option 3: Docker Setup

1. Create the environment file:
```bash
copy .env.example .env
# Edit .env with your preferred credentials
```

2. Build and start all services:
```bash
docker-compose up -d
```

3. Access the application:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Database: localhost:3306

## 📁 Directory Structure

```
project-tracking/
├── backend/                 # Express.js API
│   ├── src/
│   │   ├── config/         # Database configuration
│   │   ├── middleware/     # Express middleware
│   │   ├── routes/         # API route handlers
│   │   ├── services/       # Business logic
│   │   ├── utils/          # Utility functions
│   │   └── server.js       # Main entry point
│   ├── uploads/            # Uploaded files storage
│   ├── package.json
│   └── Dockerfile
├── frontend/               # React application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API service layer
│   │   ├── stores/         # Zustand state stores
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── public/             # Static assets
│   ├── package.json
│   └── Dockerfile
├── database/               # Database files
│   ├── schema.sql          # Main schema definition
│   ├── migrations/         # Database migrations
│   └── seeds/              # Seed data
├── docker-compose.yml      # Docker orchestration
├── package.json            # Root package with scripts
├── setup.bat               # Windows setup script
├── setup.sh                # Linux/Mac setup script
└── README.md               # This file
```

## 📚 API Documentation

### Base URL
```
http://localhost:3001/api
```

### Endpoints

#### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/projects` | List all projects (with filters) |
| GET | `/projects/:id` | Get project by ID |
| POST | `/projects` | Create new project |
| PUT | `/projects/:id` | Update project |
| DELETE | `/projects/:id` | Delete project |

#### Geospatial
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/geospatial/map-data` | Get projects for map display |
| GET | `/geospatial/bounds` | Get projects within bounds |
| GET | `/geospatial/nearby` | Get projects near coordinates |

#### Import
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/import/validate` | Validate CSV file |
| POST | `/import/upload` | Import CSV file |
| GET | `/import/progress/:id` | Get import progress |
| GET | `/import/template` | Download CSV template |

#### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/reports/stats` | Dashboard statistics |
| GET | `/reports/summary/type` | Summary by project type |
| GET | `/reports/summary/status` | Summary by status |
| GET | `/reports/summary/province` | Summary by province |
| GET | `/reports/trend/monthly` | Monthly trend data |
| GET | `/reports/export` | Export report (CSV/Excel) |

#### Reference Data
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/reference/provinces` | List all provinces |
| GET | `/reference/municipalities` | List municipalities |
| GET | `/reference/barangays` | List barangays |
| GET | `/reference/project-types` | List project types |

### Health Check
```bash
GET /api/health
```

Response:
```json
{
  "success": true,
  "message": "Project Tracking API is running",
  "timestamp": "2026-01-30T00:00:00.000Z",
  "version": "1.0.0"
}
```

## 📝 Available Scripts

### Root Directory
| Script | Description |
|--------|-------------|
| `npm run install:all` | Install dependencies for all modules |
| `npm run dev` | Start both backend and frontend in development mode |
| `npm run db:setup` | Run database schema |
| `npm run db:seed` | Seed database with sample data |
| `npm run build` | Build frontend for production |
| `npm run start` | Start backend in production mode |

### Backend
| Script | Description |
|--------|-------------|
| `npm run dev` | Start with nodemon (auto-reload) |
| `npm start` | Start in production mode |
| `npm test` | Run tests |

### Frontend
| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

## 🔐 Environment Variables

### Backend (.env)
| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3001 | Server port |
| `NODE_ENV` | development | Environment mode |
| `DB_HOST` | localhost | Database host |
| `DB_PORT` | 3306 | Database port |
| `DB_NAME` | project_tracking | Database name |
| `DB_USER` | root | Database user |
| `DB_PASSWORD` | - | Database password |
| `JWT_SECRET` | - | JWT signing key |
| `CORS_ORIGIN` | http://localhost:3000 | Allowed CORS origin |
| `UPLOAD_MAX_SIZE` | 10485760 | Max file upload size (bytes) |

### Frontend (.env.local)
| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | http://localhost:3001/api | Backend API URL |

### Docker (.env)
| Variable | Description |
|----------|-------------|
| `MYSQL_ROOT_PASSWORD` | MySQL root password |
| `MYSQL_DATABASE` | Database name to create |
| `DB_*` | Database connection for backend |
| `JWT_SECRET` | JWT secret for authentication |
| `VITE_API_URL` | API URL for frontend build |

## 🐛 Troubleshooting

### Database Connection Issues

**Error: `ECONNREFUSED` connecting to MySQL**
- Ensure MySQL service is running
- Check `DB_HOST` in `.env` - use `localhost` for local, `mysql` for Docker
- Verify database credentials are correct

**Error: `Access denied for user`**
- Verify username and password in `.env`
- Check MySQL user permissions: `GRANT ALL ON project_tracking.* TO 'user'@'localhost';`

### Backend Issues

**Error: `PORT already in use`**
- Change `PORT` in `.env` to an available port
- Or kill the process using the port

**CORS errors in browser**
- Ensure `CORS_ORIGIN` matches your frontend URL
- For development, use `http://localhost:3000`

### Frontend Issues

**Blank page after build**
- Check browser console for errors
- Verify `VITE_API_URL` is correctly set
- Ensure backend is running and accessible

**Import/CSV upload fails**
- Check `UPLOAD_MAX_SIZE` in backend `.env`
- Ensure upload directory exists and is writable
- Verify CSV format matches the template

### Docker Issues

**Containers fail to start**
- Check logs: `docker-compose logs`
- Ensure ports 3000, 3001, 3306 are available
- Delete volumes for clean start: `docker-compose down -v`

**Database not initialized**
- First startup may take time for MySQL to initialize
- Check logs: `docker-compose logs mysql`
- Run schema manually if needed

## 🤝 Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 📄 License

This project is licensed under the MIT License - see the details below:

```
MIT License

Copyright (c) 2026 Project Tracking Management System

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 🙏 Acknowledgments

- [React](https://reactjs.org/)
- [Express.js](https://expressjs.com/)
- [MySQL](https://www.mysql.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Leaflet](https://leafletjs.com/)
- [Socket.io](https://socket.io/)

## 📞 Support

For support, please open an issue on GitHub or contact the development team.

---

**Happy Tracking! 🚀**
