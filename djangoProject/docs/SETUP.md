# Development Environment Setup

**Version:** 2.0  
**Date:** February 2, 2026  

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Local Development Setup](#2-local-development-setup)
3. [Docker Development](#3-docker-development)
4. [IDE Configuration](#4-ide-configuration)
5. [Environment Variables](#5-environment-variables)
6. [Testing Setup](#6-testing-setup)
7. [Common Issues & Solutions](#7-common-issues--solutions)

---

## 1. Prerequisites

### 1.1 Required Software

| Software | Version | Purpose | Download |
|----------|---------|---------|----------|
| **Python** | 3.11+ | Backend runtime | [python.org](https://www.python.org/downloads/) |
| **Node.js** | 18+ | Frontend runtime | [nodejs.org](https://nodejs.org/) |
| **npm** | 9+ | Package manager | Comes with Node.js |
| **MySQL** | 8.0+ | Database | [mysql.com](https://dev.mysql.com/downloads/) |
| **Redis** | 7.2+ | Caching & Queues | [redis.io](https://redis.io/download) |
| **Docker** | 20.10+ | Containerization | [docker.com](https://www.docker.com/get-started/) |
| **Docker Compose** | 2.20+ | Multi-container orchestration | [docs.docker.com](https://docs.docker.com/compose/) |
| **Git** | Latest | Version control | [git-scm.com](https://git-scm.com/downloads) |

### 1.2 Verification Commands

```bash
# Check Python version
python --version  # Should be 3.11 or higher

# Check Node.js version
node --version  # Should be 18 or higher

# Check npm version
npm --version  # Should be 9 or higher

# Check MySQL version
mysql --version  # Should be 8.0 or higher

# Check Docker version
docker --version  # Should be 20.10 or higher

# Check Docker Compose version
docker-compose --version  # Should be 2.20 or higher

# Check Git version
git --version
```

---

## 2. Local Development Setup

### 2.1 Clone Repository

```bash
# Clone the repository
git clone <repository-url>
cd djangoProject

# Create and activate virtual environment
cd backend
python -m venv venv

# On Windows
venv\Scripts\activate

# On Linux/Mac
source venv/bin/activate

# Verify virtual environment is active
which python  # Should show venv path
```

### 2.2 Backend Setup

```bash
# Navigate to backend
cd backend

# Activate virtual environment (if not already active)
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt

# Verify installations
pip list | grep -E "(Django|djangorestframework|channels|celery)"

# Create .env file
cp .env.example .env

# Edit .env with your database credentials
nano .env  # or use your preferred editor

# Run database migrations
python manage.py migrate

# Create superuser for Django admin
python manage.py createsuperuser

# Follow prompts:
# Username: admin
# Email: admin@example.com
# Password: [create strong password]

# Seed reference data
python manage.py seed_data

# Start development server
python manage.py runserver

# Backend will start on http://localhost:8000
```

### 2.3 Frontend Setup

```bash
# Open new terminal
# Navigate to frontend
cd frontend

# Install Node.js dependencies
npm install

# Verify installations
npm list --depth=0

# Create .env.local file
cp .env.example .env.local

# Edit .env.local with API URL
# Default: VITE_API_URL=http://localhost:8000/api/v1/

# Start development server
npm run dev

# Frontend will start on http://localhost:3000
```

### 2.4 Run Redis (Local)

```bash
# On Windows
# Install Redis from https://github.com/microsoftarchive/redis/releases
# Start Redis server
redis-server.exe

# On Linux/Mac
# Install Redis
sudo apt-get install redis-server  # Ubuntu/Debian
brew install redis  # Mac

# Start Redis
redis-server

# Verify Redis is running
redis-cli ping
# Should return: PONG
```

### 2.5 Verify Setup

```bash
# 1. Check backend health
curl http://localhost:8000/api/v1/health

# Should return:
# {
#   "success": true,
#   "message": "API is healthy"
# }

# 2. Check frontend is accessible
curl http://localhost:3000

# Should return HTML (index page)

# 3. Test database connection
cd backend
python manage.py dbshell

# Should connect to MySQL and show MariaDB prompt
# Exit with: exit

# 4. Test Redis connection
redis-cli ping

# Should return: PONG
```

---

## 3. Docker Development

### 3.1 Quick Start with Docker

```bash
# Clone repository
git clone <repository-url>
cd djangoProject

# Copy environment template
cp .env.example .env

# Edit .env with your settings
# Important: Update DB_PASSWORD, JWT_SECRET

# Build and start all services
docker-compose up -d

# Check services are running
docker-compose ps

# Should show all services as "Up":
# mysql      Up   0.0.0.0:3306->3306/tcp
# redis      Up   0.0.0.0:6379->6379/tcp
# backend     Up   0.0.0.0:8000->8000/tcp
# frontend    Up   0.0.0.0:3000->3000/tcp

# Run migrations inside Docker container
docker-compose exec backend python manage.py migrate

# Create superuser
docker-compose exec backend python manage.py createsuperuser

# Seed data
docker-compose exec backend python manage.py seed_data

# View logs
docker-compose logs -f backend

# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

### 3.2 Docker Compose Services

```yaml
services:
  mysql:
    image: mysql:8.0
    container_name: ptms-mysql
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: ${MYSQL_DATABASE}
      MYSQL_USER: ${DB_USER}
      MYSQL_PASSWORD: ${DB_PASSWORD}
    volumes:
      - mysql_data:/var/lib/mysql
    ports:
      - "3306:3306"
    networks:
      - ptms-network

  redis:
    image: redis:7.2-alpine
    container_name: ptms-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    networks:
      - ptms-network

  backend:
    build: ./backend
    container_name: ptms-backend
    restart: unless-stopped
    environment:
      DB_HOST: mysql
      DB_PORT: 3306
      DB_NAME: ${MYSQL_DATABASE}
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
      REDIS_URL: redis://redis:6379/1
      DJANGO_SETTINGS_MODULE: config.settings.development
    depends_on:
      - mysql
      - redis
    ports:
      - "8000:8000"
    volumes:
      - ./backend:/app
      - backend_uploads:/app/media/uploads
    networks:
      - ptms-network

  frontend:
    build: ./frontend
    container_name: ptms-frontend
    restart: unless-stopped
    environment:
      VITE_API_URL: http://localhost:8000/api/v1/
    depends_on:
      - backend
    ports:
      - "3000:3000"
    networks:
      - ptms-network

networks:
  ptms-network:
    driver: bridge

volumes:
  mysql_data:
  backend_uploads:
```

### 3.3 Docker Commands

```bash
# Build images
docker-compose build

# Start services in detached mode
docker-compose up -d

# Start services with logs
docker-compose up

# Stop services
docker-compose stop

# Stop and remove containers
docker-compose down

# Stop and remove containers and volumes
docker-compose down -v

# View logs for all services
docker-compose logs

# View logs for specific service
docker-compose logs backend

# Follow logs (real-time)
docker-compose logs -f backend

# Execute command in container
docker-compose exec backend python manage.py shell

# Rebuild specific service
docker-compose build backend

# Pull latest images
docker-compose pull

# Remove old images
docker-compose down --rmi all
```

---

## 4. IDE Configuration

### 4.1 VS Code

#### Extensions

| Extension | Purpose |
|-----------|---------|
| Python | Python language support |
| Pylance | Python IntelliSense |
| Django | Django template support |
| ESLint | JavaScript/TypeScript linting |
| Tailwind CSS IntelliSense | Tailwind autocomplete |
| Error Lens | Better error messages |
| GitLens | Git integration |

#### Settings (.vscode/settings.json)

```json
{
  "python.defaultInterpreterPath": "./backend/venv/bin/python",
  "python.linting.enabled": true,
  "python.linting.pylintEnabled": true,
  "python.testing.pytestEnabled": true,
  "python.testing.pytestArgs": ["--no-migrations"],
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  
