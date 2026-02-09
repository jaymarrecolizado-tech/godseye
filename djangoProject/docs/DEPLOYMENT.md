# Production Deployment Guide

**Version:** 2.0  
**Date:** February 2, 2026  

---

## Table of Contents

1. [Deployment Overview](#1-deployment-overview)
2. [Prerequisites](#2-prerequisites)
3. [Docker Deployment](#3-docker-deployment)
4. [Environment Variables](#4-environment-variables)
5. [Database Setup](#5-database-setup)
6. [Celery Workers](#6-celery-workers)
7. [Nginx Configuration](#7-nginx-configuration)
8. [SSL/TLS Setup](#8-ssltls-setup)
9. [Monitoring](#9-monitoring)
10. [Backup Strategy](#10-backup-strategy)
11. [Rollback Plan](#11-rollback-plan)
12. [Deployment Checklist](#12-deployment-checklist)

---

## 1. Deployment Overview

### 1.1 Architecture Diagram

```
Internet
    ↓
[Nginx] (SSL/TLS, Load Balancer)
    ↓
[Django App] (Gunicorn/Daphne) ← [Celery Workers]
    ↓
[MySQL] (Primary Database)
    ↓
[Redis] (Cache & Queue)
```

### 1.2 Deployment Targets

| Target | Description |
|--------|-------------|
| **Django Backend** | API server running on port 8000 |
| **React Frontend** | Static files served by Nginx |
| **MySQL Database** | Production database with replication |
| **Redis** | Caching and Celery broker |
| **Celery Workers** | Background task processing |
| **Nginx** | Reverse proxy and static file server |

---

## 2. Prerequisites

### 2.1 Server Requirements

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| **CPU** | 2 cores | 4+ cores |
| **RAM** | 4 GB | 8+ GB |
| **Storage** | 50 GB | 200+ GB SSD |
| **Operating System** | Ubuntu 20.04+ / CentOS 8+ | Ubuntu 22.04 LTS |

### 2.2 Software Requirements

| Software | Version |
|----------|---------|
| **Python** | 3.11+ |
| **Node.js** | 18+ |
| **MySQL** | 8.0+ |
| **Redis** | 7.2+ |
| **Nginx** | 1.20+ |
| **Docker** | 20.10+ |
| **Git** | Latest |

### 2.3 Network Requirements

- **Public IP** (for DNS)
- **Open Ports**: 80 (HTTP), 443 (HTTPS), 22 (SSH)
- **Bandwidth**: 10+ Mbps recommended

---

## 3. Docker Deployment

### 3.1 Production Docker Compose

**docker-compose.prod.yml:**
```yaml
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    container_name: ptms-mysql-prod
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: ${MYSQL_DATABASE}
      MYSQL_USER: ${DB_USER}
      MYSQL_PASSWORD: ${DB_PASSWORD}
    volumes:
      - mysql_data:/var/lib/mysql
      - ./backups:/var/lib/mysql-backups
    networks:
      - ptms-network
    command: --default-authentication-plugin=mysql_native_password

  redis:
    image: redis:7.2-alpine
    container_name: ptms-redis-prod
    restart: always
    volumes:
      - redis_data:/data
    networks:
      - ptms-network
    command: redis-server --appendonly yes

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    image: ptms-backend:latest
    container_name: ptms-backend-prod
    restart: always
    environment:
      DJANGO_SETTINGS_MODULE: config.settings.production
      DB_HOST: mysql
      DB_PORT: 3306
      DB_NAME: ${MYSQL_DATABASE}
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
      REDIS_URL: redis://redis:6379/1
      CELERY_BROKER_URL: redis://redis:6379/1
      CELERY_RESULT_BACKEND: redis://redis:6379/1
      SECRET_KEY: ${SECRET_KEY}
      ALLOWED_HOSTS: ${ALLOWED_HOSTS}
    volumes:
      - backend_media:/app/media
      - backend_logs:/app/logs
      - backend_static:/app/staticfiles
    depends_on:
      - mysql
      - redis
    networks:
      - ptms-network
    command: gunicorn config.wsgi:application --workers 4 --bind 0.0.0.0:8000

  celery_worker:
    build:
      context: ./backend
      dockerfile: Dockerfile
    image: ptms-backend:latest
    container_name: ptms-celery-worker
    restart: always
    environment:
      DJANGO_SETTINGS_MODULE: config.settings.production
      DB_HOST: mysql
      DB_PORT: 3306
      DB_NAME: ${MYSQL_DATABASE}
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
      REDIS_URL: redis://redis:6379/1
      CELERY_BROKER_URL: redis://redis:6379/1
      CELERY_RESULT_BACKEND: redis://redis:6379/1
      SECRET_KEY: ${SECRET_KEY}
    volumes:
      - backend_media:/app/media
    depends_on:
      - mysql
      - redis
    networks:
      - ptms-network
    command: celery -A config worker -l info -Q celery --loglevel=info --concurrency=2

  celery_beat:
    build:
      context: ./backend
      dockerfile: Dockerfile
    image: ptms-backend:latest
    container_name: ptms-celery-beat
    restart: always
    environment:
      DJANGO_SETTINGS_MODULE: config.settings.production
      REDIS_URL: redis://redis:6379/1
      CELERY_BROKER_URL: redis://redis:6379/1
      CELERY_RESULT_BACKEND: redis://redis:6379/1
      SECRET_KEY: ${SECRET_KEY}
    depends_on:
      - redis
    networks:
      - ptms-network
    command: celery -A config beat -l info --scheduler django_celery_beat:Schedule

  nginx:
    image: nginx:alpine
    container_name: ptms-nginx-prod
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - backend_static:/var/www/static:ro
      - ./ssl:/etc/nginx/ssl:ro
      - nginx_logs:/var/log/nginx
    depends_on:
      - backend
    networks:
      - ptms-network

networks:
  ptms-network:
    driver: bridge

volumes:
  mysql_data:
  redis_data:
  backend_media:
  backend_logs:
  backend_static:
  nginx_logs:
```

### 3.2 Backend Dockerfile

**backend/Dockerfile:**
```dockerfile
FROM python:3.11-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    gcc \
    default-libmysqlclient-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements file
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create directories for media and logs
RUN mkdir -p media logs staticfiles

# Collect static files
RUN python manage.py collectstatic --noinput

# Expose port
EXPOSE 8000

# Run application with gunicorn
CMD ["gunicorn", "config.wsgi:application", "--workers", "4", "--bind", "0.0.0.0:8000"]
```

### 3.3 Frontend Dockerfile

**frontend/Dockerfile:**
```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
```

---

## 4. Environment Variables

### 4.1 Production .env

**.env.production:**
```bash
# Django
SECRET_KEY=<generate-strong-random-key>
DEBUG=False
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
SECURE_SSL_REDIRECT=True
SECURE_HSTS_SECONDS=31536000
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True

# Database
DB_HOST=mysql-production
DB_PORT=3306
DB_NAME=project_tracking
DB_USER=project_user
DB_PASSWORD=<strong-random-password>
MYSQL_ROOT_PASSWORD=<strong-root-password>

# Redis
REDIS_URL=redis://redis-prod:6379/1

# Celery
CELERY_BROKER_URL=redis://redis-prod:6379/1
CELERY_RESULT_BACKEND=redis://redis-prod:6379/1

# CORS
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
CORS_ALLOW_CREDENTIALS=True

# File Upload
UPLOAD_MAX_SIZE=10485760

# Email
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=noreply@yourdomain.com
EMAIL_HOST_PASSWORD=<app-password>
DEFAULT_FROM_EMAIL=noreply@yourdomain.com
```

### 4.2 Generating Secret Key

```bash
# Python
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"

# Output example:
# django-insecure-random-key-here-change-in-production-50-char-long
```

---

## 5. Database Setup

### 5.1 MySQL Production Configuration

**MySQL Production Settings:**
```sql
-- my.cnf

[my
