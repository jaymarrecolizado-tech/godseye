# Django Backend Development Guide

**Version:** 2.0  
**Date:** February 2, 2025  

---

## Table of Contents

1. [Project Structure](#1-project-structure)
2. [Django Apps](#2-django-apps)
3. [Common Patterns](#3-common-patterns)
4. [Development Workflow](#4-development-workflow)
5. [Useful Commands](#5-useful-commands)

---

## 1. Project Structure

### 1.1 Django Project Layout

```
backend/
├── config/                    # Django configuration
│   ├── __init__.py
│   ├── __main__.py         # WSGI/ASGI entry point
│   ├── settings/
│   │   ├── __init__.py
│   │   ├── base.py         # Base settings
│   │   ├── development.py  # Dev settings
│   │   ├── production.py   # Production settings
│   │   └── test.py        # Test settings
│   ├── urls.py             # Root URL configuration
│   ├── wsgi.py             # WSGI config (Gunicorn)
│   └── asgi.py             # ASGI config (Daphne)
│
├── apps/                    # Django apps (modular)
│   ├── accounts/            # User management
│   ├── locations/           # Location hierarchy
│   ├── projects/            # Project CRUD
│   ├── geo/                # Geospatial queries
│   ├── import_export/       # CSV import/export
│   ├── reports/             # Analytics & reporting
│   ├── notifications/       # WebSocket notifications
│   └── audit/              # Audit logging
│
├── core/                    # Shared utilities
│   ├── pagination.py       # Custom pagination
│   ├── permissions.py       # Base permissions
│   ├── exceptions.py       # Custom exceptions
│   ├── utils.py           # Utility functions
│   └── mixins.py          # ViewSet mixins
│
├── media/                   # User uploads
│   └── uploads/
│
├── static/                  # Static files
│   └── css/
│
├── locale/                  # Translations
├── logs/                    # Application logs
├── manage.py                # Django management script
├── requirements.txt           # Python dependencies
└── .env.example              # Environment template
```

---

## 2. Django Apps

### 2.1 Accounts App (User Management)

**Purpose:** Authentication, user CRUD, permissions

**Files:**
- `models.py` - Custom User model with roles
- `serializers.py` - User, login, password reset serializers
- `views.py` - Login, logout, user CRUD views
- `urls.py` - URL routing
- `permissions.py` - Custom permission classes
- `admin.py` - Django admin configuration

**Key Models:**
```python
class User(AbstractUser):
    full_name = models.CharField(max_length=100)
    role = models.CharField(max_length=20, choices=UserRole.choices)
    is_active = models.BooleanField(default=True)
    last_login = models.DateTimeField(null=True, blank=True)
```

**Key Views:**
```python
class LoginView(APIView):
    def post(self, request):
        # Authenticate user
        user = authenticate(request, username=..., password=...)
        
        # Create session
        login(request, user)
        
        # Return user data
        return Response({'success': True, 'data': {...}})
```

### 2.2 Projects App (Project Management)

**Purpose:** Project CRUD operations, status tracking

**Files:**
- `models.py` - ProjectSite, ProjectType, ProjectStatusHistory
- `serializers.py` - Project serializers
- `views.py` - Project ViewSet
- `urls.py` - URL routing
- `filters.py` - Django-filter filters
- `permissions.py` - Project permissions
- `admin.py` - Django admin configuration

**Key Models:**
```python
class ProjectSite(models.Model):
    site_code = models.CharField(max_length=30, unique=True)
    project_type = models.ForeignKey(ProjectType, on_delete=models.RESTRICT)
    site_name = models.CharField(max_length=150)
    location = PointField(srid=4326)
    status = models.CharField(max_length=20, choices=ProjectStatus.choices)
    is_deleted = models.BooleanField(default=False)
    
    def save(self, *args, **kwargs):
        # Auto-update location from lat/lng
        self.location = Point(self.longitude, self.latitude, srid=4326)
        super().save(*args, **kwargs)
```

**Key ViewSet:**
```python
class ProjectViewSet(viewsets.ModelViewSet):
    queryset = ProjectSite.objects.all()
    serializer_class = ProjectSiteSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_class = ProjectFilter
    
    def perform_create(self, serializer):
        serializer.validated_data['created_by'] = self.request.user
        return super().perform_create(serializer)
```

### 2.3 Geo App (Geospatial Queries)

**Purpose:** Spatial queries, GeoJSON generation

**Files:**
- `views.py` - Geospatial query views
- `urls.py` - URL routing
- `services.py` - Spatial query services

**Key Views:**
```python
class MapDataView(APIView):
    def get(self, request):
        """Return all projects as GeoJSON"""
        projects = ProjectSite.objects.select_related('project_type').all()
        
        features = [{
            'type': 'Feature',
            'geometry': {
                'type': 'Point',
                'coordinates': [float(p.longitude), float(p.latitude)]
            },
            'properties': {
                'id': p.id,
                'site_code': p.site_code,
                'site_name': p.site_name,
                'project_type': p.project_type.name,
                'color_code': p.project_type.color_code,
                'status': p.status
            }
        } for p in projects]
        
        return Response({
            'type': 'FeatureCollection',
            'features': features
        })

class NearbyProjectsView(APIView):
    def get(self, request):
        """Find projects within radius"""
        lat = float(request.query_params.get('lat'))
        lng = float(request.query_params.get('lng'))
        radius = float(request.query_params.get('radius', 10000))  # Default 10km
        
        reference_point = Point(lng, lat, srid=4326)
        
        projects = ProjectSite.objects.filter(
            location__distance_lte=(reference_point, D(km=radius/1000))
        ).annotate(
            distance_km=Distance('location', reference_point) / 1000
        ).order_by('distance_km')
        
        return Response({'data': list(projects)})
```

### 2.4 Import/Export App (CSV Processing)

**Purpose:** CSV upload, validation, Celery tasks

**Files:**
- `models.py` - CSVImport model
- `serializers.py` - CSV import/export serializers
- `views.py` - Upload, download, progress views
- `urls.py` - URL routing
- `tasks.py` - Celery tasks
- `validators.py` - CSV validation

**Key Celery Task:**
```python
@shared_task(bind=True, max_retries=3)
def process_csv_import(self, import_id, file_path):
    """Process CSV import in background"""
    import_record = CSVImport.objects.get(id=import_id)
    
    try:
        # Update status to Processing
        import_record.status = 'Processing'
        import_record.started_at = timezone.now()
        import_record.save()
        
        # Read CSV with pandas
        df = pd.read_csv(file_path)
        
        # Process each row
        success_count = 0
        error_count = 0
        errors = []
        
        for index, row in df.iterrows():
            try:
                # Validate row
                validate_row(row)
                
                # Create project
                project = create_project_from_row(row)
                success_count += 1
                
                # Update progress
                progress = int((index + 1) / len(df) * 100)
                self.update_state(
                    state='PROGRESS',
                    meta={'current': index + 1, 'total': len(df), 'percentage': progress}
                )
                
            except Exception as e:
                error_count += 1
                errors.append({'row': index + 2, 'error': str(e)})
        
        # Update import record
        import_record.success_count = success_count
        import_record.error_count = error_count
        import_record.errors = errors
        import_record.status = 'Completed' if error_count == 0 else 'Partial'
        import_record.completed_at 
