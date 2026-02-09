# Database Schema & Models

**Version:** 2.0  
**Date:** February 2, 2026  

---

## Table of Contents

1. [Schema Overview](#1-schema-overview)
2. [Django Models](#2-django-models)
3. [Relationships](#3-relationships)
4. [Indexes](#4-indexes)
5. [Migration Commands](#5-migration-commands)
6. [Seed Data Structure](#6-seed-data-structure)
7. [Spatial Queries](#7-spatial-queries)

---

## 1. Schema Overview

### 1.1 Entity Relationship Diagram

```mermaid
erDiagram
    PROVINCES ||--o{ MUNICIPALITIES : contains
    MUNICIPALITIES ||--o{ BARANGAYS : contains
    DISTRICTS ||--o{ MUNICIPALITIES : covers
    PROJECT_TYPES ||--o{ PROJECT_SITES : categorizes
    PROJECT_SITES ||--o{ PROJECT_STATUS_HISTORY : tracks
    USERS ||--o{ PROJECT_SITES : manages
    USERS ||--o{ AUDIT_LOGS : generates
    PROJECT_SITES ||--o{ AUDIT_LOGS : referenced_by
    PROJECT_SITES ||--o{ CSV_IMPORTS : referenced_by
    
    PROVINCES {
        int id PK
        varchar name
        varchar region_code
        point centroid
        polygon boundary
        datetime created_at
        datetime updated_at
    }
    
    DISTRICTS {
        int id PK
        int province_id FK
        varchar name
        varchar district_code
        datetime created_at
    }
    
    MUNICIPALITIES {
        int id PK
        int province_id FK
        int district_id FK
        varchar name
        varchar municipality_code
        point centroid
        datetime created_at
    }
    
    BARANGAYS {
        int id PK
        int municipality_id FK
        varchar name
        varchar barangay_code
        point centroid
        datetime created_at
    }
    
    PROJECT_TYPES {
        int id PK
        varchar name
        varchar code_prefix
        text description
        varchar color_code
        varchar icon_url
        boolean is_active
        datetime created_at
        datetime updated_at
    }
    
    PROJECT_SITES {
        int id PK
        varchar site_code UK
        int project_type_id FK
        varchar site_name
        int barangay_id FK
        int municipality_id FK
        int province_id FK
        int district_id FK
        decimal latitude
        decimal longitude
        point location SPATIAL_INDEX
        date activation_date
        enum status
        text remarks
        json metadata
        int created_by FK
        int updated_by FK
        datetime created_at
        datetime updated_at
        boolean is_deleted
    }
    
    PROJECT_STATUS_HISTORY {
        int id PK
        int project_site_id FK
        enum old_status
        enum new_status
        text reason
        int changed_by FK
        datetime changed_at
    }
    
    USERS {
        int id PK
        varchar username UK
        varchar email UK
        varchar password_hash
        varchar full_name
        enum role
        boolean is_active
        datetime last_login
        datetime created_at
        datetime updated_at
    }
    
    AUDIT_LOGS {
        bigint id PK
        int user_id FK
        varchar table_name
        int record_id
        enum action
        json old_values
        json new_values
        varchar ip_address
        varchar user_agent
        datetime created_at
    }
    
    CSV_IMPORTS {
        int id PK
        varchar filename
        varchar original_filename
        int total_rows
        int success_count
        int error_count
        json errors
        int imported_by FK
        enum status
        datetime started_at
        datetime completed_at
        datetime created_at
    }
    
    NOTIFICATIONS {
        int id PK
        int user_id FK
        varchar title
        text message
        enum notification_type
        boolean is_read
        int related_project_id
        datetime created_at
    }
```

---

## 2. Django Models

### 2.1 User Model (apps/accounts/models.py)

```python
from django.contrib.auth.models import AbstractUser
from django.db import models

class UserRole(models.TextChoices):
    ADMIN = 'Admin', 'Admin'
    MANAGER = 'Manager', 'Manager'
    EDITOR = 'Editor', 'Editor'
    VIEWER = 'Viewer', 'Viewer'

class User(AbstractUser):
    """Custom user model with additional fields"""
    full_name = models.CharField(max_length=100)
    role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.VIEWER
    )
    is_active = models.BooleanField(default=True)
    last_login = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'users'
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        indexes = [
            models.Index(fields=['role']),
            models.Index(fields=['is_active']),
        ]
    
    def __str__(self):
        return f"{self.full_name} ({self.role})"
```

### 2.2 Location Models (apps/locations/models.py)

#### Province Model

```python
from django.db import models
from django.contrib.gis.db import models as gis_models

class Province(models.Model):
    """Administrative province level"""
    name = models.CharField(max_length=100)
    region_code = models.CharField(max_length=10, null=True, blank=True)
    centroid = gis_models.PointField(srid=4326, null=True, blank=True)
    boundary = gis_models.PolygonField(srid=4326, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'provinces'
        verbose_name = 'Province'
        verbose_name_plural = 'Provinces'
        indexes = [
            models.Index(fields=['name']),
        ]
    
    def __str__(self):
        return self.name
```

#### District Model

```python
class District(models.Model):
    """Legislative district"""
    province = models.ForeignKey(Province, on_delete=models.CASCADE)
    name = models.CharField(max_length=50)
    district_code = models.CharField(max_length=20, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'districts'
        verbose_name = 'District'
        verbose_name_plural = 'Districts'
        indexes = [
            models.Index(fields=['province']),
            models.Index(fields=['name']),
        ]
    
    def __str__(self):
        return f"{self.province.name} - {self.name}"
```

#### Municipality Model

```python
class Municipality(models.Model):
    """City or municipality"""
    province = models.ForeignKey(Province, on_delete=models.CASCADE)
    district = models.ForeignKey(District, on_delete=models.SET_NULL, null=True, blank=True)
    name = models.CharField(max_length=100)
    municipality_code = models.CharField(max_length=20, null=True, blank=True)
    centroid = gis_models.PointField(srid=4326, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'municipalities'
        verbose_name = 'Municipality'
        verbose_name_plural = 'Municipalities'
        indexes = [
            models.Index(fields=['province']),
            models.Index(fields=['district']),
            models.Index(fields=['name']),
        ]
    
    def __str__(self):
        return self.name
```

#### Barangay Model

```python
class Barangay(models.Model):
    """Smallest administrative unit"""
    municipality = models.ForeignKey(Municipality, on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    barangay_code = models.CharField(max_length=20, null=True, blank=True)
    centroid = gis_models.PointField(srid=4326, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'barangays'
        verbose_name = 'Barangay'
        verbose_name_plural = 'Barangays'
        indexes = [
            models.Index(fields=['municipality']),
            models.Index(fields=['name']),
        ]
    
    def __str__(self):
        return self.name
```

### 2.3 Project Models (apps/projects/models.py)

#### ProjectType Model

```python
