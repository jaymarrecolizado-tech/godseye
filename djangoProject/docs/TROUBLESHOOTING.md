# Troubleshooting Guide

**Version:** 2.0  
**Date:** February 2, 2025  

---

## Table of Contents

1. [Common Issues](#1-common-issues)
2. [Backend Issues](#2-backend-issues)
3. [Frontend Issues](#3-frontend-issues)
4. [Docker Issues](#4-docker-issues)
5. [Database Issues](#5-database-issues)
6. [Deployment Issues](#6-deployment-issues)
7. [Performance Issues](#7-performance-issues)
8. [Development Workflow Issues](#8-development-workflow-issues)

---

## 1. Common Issues

### 1.1 Port Already in Use

**Error:** `Error: That port is already in use` or `EADDRINUSE`

**Solutions:**
1. **Find process using the port:**
   ```bash
   # Windows (PowerShell)
   Get-NetTCPConnection -LocalPort 8000 -State LISTENING | Select-Object LocalPort,LocalAddress | Where-Object {$_.LocalPort -eq 8000}
   
   # Linux/Mac
   lsof -i :8000  # Shows process using port 8000
   ss -ltnp :8000  # Shows process using port 8000
   
   # Kill process
   # Windows
   Stop-Process -Id <PID>
   # Linux/Mac
   kill -9 <PID>
   ```

2. **Change port in configuration:**
   ```bash
   # Backend (.env)
   PORT=8001
   
   # Frontend (.env.local)
   VITE_PORT=3001
   ```

3. **Use `lsof` with PID to find process:**
   ```bash
   lsof -i :8000 -t -P
   ```

### 1.2 Module Not Found

**Error:** `ModuleNotFoundError: No module named 'xxx'` or `ImportError: cannot import name 'xxx'`

**Solutions:**
1. **Ensure virtual environment is activated:**
   ```bash
   cd backend
   # Windows
   venv\Scripts\activate
   
   # Linux/Mac
   source venv/bin/activate
   ```

2. **Reinstall requirements:**
   ```bash
   pip install -r requirements.txt --force-reinstall
   ```

3. **Check for typos in import:**
   ```python
   # Wrong: from apps.projects.models import Project
   # Right: from apps.projects.models import ProjectSite
   ```

4. **Check app is in INSTALLED_APPS:**
   ```python
   # config/settings/base.py
   INSTALLED_APPS = [
       'apps.projects',  # Make sure this is added
       # ...
   ]
   ```

### 1.3 Database Connection Errors

**Error:** `Can't connect to MySQL server` or `OperationalError: Access denied for user`

**Solutions:**
1. **Verify MySQL is running:**
   ```bash
   # Windows
   netstat -an | findstr :3306
   
   # Linux/Mac
   lsof -i :3306
   mysqladmin -u root -p status
   ```

2. **Check credentials in .env:**
   ```bash
   cat backend/.env
   # Verify:
   # DB_HOST=localhost
   # DB_PORT=3306
   # DB_NAME=project_tracking
   # DB_USER=root
   # DB_PASSWORD=your-password
   ```

3. **If using Docker, check service name:**
   ```bash
   # Docker uses service name, not localhost
   # .env should have:
   # DB_HOST=mysql
   ```

4. **Create database if it doesn't exist:**
   ```bash
   mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS project_tracking;"
   mysql -u root -p project_tracking < schema.sql
   ```

5. **Check firewall settings:**
   ```bash
   # Windows
   netsh advfirewall show allprofiles
   netsh advfirewall firewall add rule name="MySQL" dir=in action=allow protocol=TCP localport=3306
   
   # Linux (UFW)
   sudo ufw allow 3306/tcp
   ```

### 1.4 Migration Errors

**Error:** `django.db.migrations.exceptions.InconsistentMigrationHistory`

**Solutions:**
1. **Rollback migration:**
   ```bash
   python manage.py migrate projects 0002
   ```

2. **Fake migration (if database is already set up):**
   ```bash
   python manage.py migrate --fake-initial
   ```

3. **Check for circular imports in models.py:**
   ```python
   # Circular import example:
   # from apps.projects.models import Project
   # from apps.projects.models import Project  # Avoid this
   ```

4. **Delete migration file and recreate:**
   ```bash
   rm backend/apps/projects/migrations/0003_auto_2024*.py
   python manage.py makemigrations
   ```

### 1.5 CORS Errors

**Error:** `Access to XMLHttpRequest at ... from origin ... has been blocked by CORS policy`

**Solutions:**
1. **Check CORS_ALLOWED_ORIGINS in backend/.env:**
   ```bash
   cat backend/.env
   # Should include:
   # CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
   ```

2. **Check frontend API URL:**
   ```bash
   cat frontend/.env.local
   # VITE_API_URL=http://localhost:8000/api/v1/
   ```

3. **Check Django CORS middleware:**
   ```python
   # config/settings/base.py
   CORS_ALLOWED_ORIGINS = [
       "http://localhost:3000",
       "http://localhost:5173",
   ]
   CORS_ALLOW_CREDENTIALS = True
   ```

4. **Check preflight requests in browser:**
   - Open browser DevTools (F12)
   - Go to Network tab
   - Check OPTIONS request to API

### 1.6 Static Files Not Found

**Error:** `FileNotFoundError: [Errno 2] No such file or directory` when accessing `/static/`

**Solutions:**
1. **Run collectstatic:**
   ```bash
   cd backend
   python manage.py collectstatic --noinput
   ```

2. **Check STATIC_ROOT in settings:**
   ```python
   # config/settings/base.py
   STATIC_ROOT = BASE_DIR / 'staticfiles'
   ```

3. **Check Nginx static files configuration:**
   ```nginx
   # nginx.conf
   location /static/ {
       alias /var/www/staticfiles;
   }
   ```

4. **Ensure directory exists:**
   ```bash
   mkdir -p backend/staticfiles
   ```

### 1.7 Session Issues

**Error:** `Session expired` or `CSRF token missing`

**Solutions:**
1. **Clear session cookie:**
   ```bash
   # Browser DevTools (F12)
   # Application → Cookies
   # Find sessionid cookie
   # Right-click → Delete
   ```

2. **Login again:**
   - Navigate to `/login`
   - Enter credentials again

3. **Check session age in settings:**
   ```python
   # config/settings/base.py
   SESSION_COOKIE_AGE = 1800  # 30 minutes in seconds
   ```

### 1.8 Docker Container Issues

**Error:** `Container exited with code 1` or `Container health check failed`

**Solutions:**
1. **View container logs:**
   ```bash
   docker-compose logs backend
   docker-compose logs -f backend
   ```

2. **Check container status:**
   ```bash
   docker-compose ps
   ```

3. **Restart container:**
   ```bash
   docker-compose restart backend
   ```

4. **Rebuild container:**
   ```bash
   docker-compose build --no-cache backend
   docker-compose up -d backend
   ```

5. **Check for permission issues:**
   ```bash
   # On Linux
   ls -la backend/media/uploads
   chmod -R 755 backend/media/uploads
   
   # On Windows (PowerShell)
   icacls backend/media/uploads
   icacls backend/media/uploads /grant Everyone:(OI)(CI)F
   ```

---

## 2. Backend Issues

### 2.1 Django Development Server Won't Start

**Error:** `CommandError: That port is already in use` or `Address already in use`

**Solutions:**
1. **Kill process using the port:**
   ```bash
   lsof -i :8000
   kill -9 <PID>
   ```

2. **Use different port:**
   ```bash
   # backend/.env
   PORT=8001
   ```

3. **Check for zombie processes:**
   ```bash
   ps aux | grep manage.py
   ```

### 2.2 Database Query Performance

**Issue:** Queries are slow or using N+1 queries

**Solutions:**
1. **Use select_related:**
   ```python
   # BAD (N+1 queries)
   projects = ProjectSite.objects.all()
   for project in projects:
       print(project.project_type.name)  # Separate query for each
   
   # GOOD (1 query)
   projects = ProjectSite.objects.select_related('project_type').all()
   for project in projects:
       print(project.project_type.name)  # No additional query
   ```

2. **Use prefetch_related:**
   ```python
   projects = ProjectSite.objects.prefetch_related('status_history').all()
   for project in projects:
       for history in project.status_history.all():
           print(history.new_status)  # Cached
   ```

3. **Use only():**
   ```python
   # Fetch only needed fields
   projects = ProjectSite.objects.only(
       'id', 'site_code', 'site_name', 'status'
   ).all()
   ```

4. **Use annotate() for aggregations:**
   ```python
   from django.db.models import Count, Avg, Sum, Max
   
   stats = ProjectSite.objects.aggregate(
       total=Count('id'),
       avg_progress=Avg('activation_date'),
       max_date=Max('activation_date')
   )
   ```

### 2.3 Celery Workers Not Running

**Issue:** Tasks are not being processed

**Solutions:**
1. **Check Celery worker stat
