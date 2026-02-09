# Security Implementation Guide

**Version:** 2.0  
**Date:** February 2, 2026  

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Authorization](#2-authorization)
3. [Password Policies](#3-password-policies)
4. [CSRF Protection](#4-csrf-protection)
5. [XSS Prevention](#5-xss-prevention)
6. [SQL Injection Prevention](#6-sql-injection-prevention)
7. [File Upload Security](#7-file-upload-security)
8. [Rate Limiting](#8-rate-limiting)
9. [Audit Logging](#9-audit-logging)
10. [HTTPS/TLS](#10-httpstls)

---

## 1. Authentication

### 1.1 Django Authentication System

Django's built-in authentication system provides secure session-based authentication.

### 1.2 Session Management

**config/settings/base.py:**
```python
# Session configuration
SESSION_ENGINE = 'django.contrib.sessions.backends.cache.RedisCache'
SESSION_CACHE_ALIAS = 'default'
SESSION_COOKIE_NAME = 'sessionid'
SESSION_COOKIE_AGE = 1800  # 30 minutes in seconds
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'  # Or 'Strict' in production
SESSION_COOKIE_SECURE = False  # Set True in production
SESSION_SAVE_EVERY_REQUEST = True
SESSION_EXPIRE_AT_BROWSER_CLOSE = False
```

### 1.3 Password Hashing

Django uses PBKDF2 (Password-Based Key Derivation Function 2) with SHA256 by default.

**Password Hashing Configuration:**
```python
# config/settings/base.py
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.PBKDF2PasswordHasher',
    'django.contrib.auth.hashers.Argon2PasswordHasher',
]

# PBKDF2 options (default)
PASSWORD_HASHERS = 'django.contrib.auth.hashers.PBKDF2PasswordHasher'
PBKDF2_ITERATIONS = 390000  # Number of iterations
PBKDF2_SALT_LENGTH = 128
```

**Password Complexity Validation:**
```python
# apps/accounts/validators.py
from django.core.exceptions import ValidationError
import re

def validate_password_complexity(password):
    """Validate password meets complexity requirements"""
    if len(password) < 8:
        raise ValidationError('Password must be at least 8 characters long.')
    
    if not re.search(r'[A-Z]', password):
        raise ValidationError('Password must contain at least one uppercase letter.')
    
    if not re.search(r'[a-z]', password):
        raise ValidationError('Password must contain at least one lowercase letter.')
    
    if not re.search(r'[0-9]', password):
        raise ValidationError('Password must contain at least one digit.')
    
    # Optional: Require special character
    # if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
    #     raise ValidationError('Password must contain at least one special character.')
    
    return password
```

### 1.4 Login Flow

```python
# apps/accounts/views.py
from django.contrib.auth import authenticate, login
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

@api_view(['POST'])
@csrf_exempt
def login_view(request):
    """Handle login request"""
    username = request.data.get('username')
    password = request.data.get('password')
    
    # Authenticate user
    user = authenticate(request, username=username, password=password)
    
    if user is None:
        return Response(
            {'success': False, 'error': 'Invalid credentials'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    # Check if user is active
    if not user.is_active:
        return Response(
            {'success': False, 'error': 'Account is deactivated'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    # Create session
    login(request, user)
    
    # Update last login
    user.last_login = timezone.now()
    user.save()
    
    return Response({
        'success': True,
        'data': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'full_name': user.full_name,
            'role': user.role
        }
    })
```

### 1.5 Logout Flow

```python
from django.contrib.auth import logout
from rest_framework.decorators import api_view
from rest_framework.response import Response

@api_view(['POST'])
def logout_view(request):
    """Handle logout request"""
    # Logout user
    logout(request)
    
    # Clear session
    request.session.flush()
    
    return Response({
        'success': True,
        'message': 'Logged out successfully'
    })
```

---

## 2. Authorization

### 2.1 Role-Based Access Control (RBAC)

**User Role Enum:**
```python
class UserRole(models.TextChoices):
    ADMIN = 'Admin', 'Admin'
    MANAGER = 'Manager', 'Manager'
    EDITOR = 'Editor', 'Editor'
    VIEWER = 'Viewer', 'Viewer'
```

### 2.2 Permission Classes

**core/permissions.py:**
```python
from rest_framework import permissions

class IsAdminOrManager(permissions.BasePermission):
    """Allow access to Admin or Manager users"""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role in [UserRole.ADMIN, UserRole.MANAGER]

class IsAdminOrEditor(permissions.BasePermission):
    """Allow access to Admin, Manager, or Editor"""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role in [UserRole.ADMIN, UserRole.MANAGER, UserRole.EDITOR]

class IsAuthenticated(permissions.BasePermission):
    """Allow access to authenticated users"""
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated
```

### 2.3 Permission Enforcement in Views

```python
# apps/projects/views.py
from rest_framework import viewsets
from core.permissions import IsAdminOrEditor, IsAuthenticated

class ProjectViewSet(viewsets.ModelViewSet):
    queryset = ProjectSite.objects.all()
    serializer_class = ProjectSiteSerializer
    permission_classes = [IsAuthenticated]
    
    def get_permissions(self):
        """Dynamic permissions based on action"""
        if self.action in ['create', 'update', 'destroy']:
            return [IsAdminOrEditor()]
        return super().get_permissions()
    
    def perform_create(self, serializer):
        """Automatically set created_by"""
        serializer.validated_data['created_by'] = self.request.user
        return super().perform_create(serializer)
    
    def perform_update(self, serializer):
        """Automatically set updated_by"""
        serializer.validated_data['updated_by'] = self.request.user
        return super().perform_update(serializer)
```

### 2.4 Object-Level Permissions

```python
from rest_framework import permissions

class IsOwnerOrReadOnly(permissions.BasePermission):
    """Allow access to object owner or read-only"""
    def has_object_permission(self, request, view, obj):
        # Read-only permissions for safe methods
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Check if user created the object
        return obj.created_by == request.user
```

---

## 3. Password Policies

### 3.1 Password Requirements

| Requirement | Specification |
|-------------|--------------|
| **Minimum Length** | 8 characters |
| **Uppercase** | At least 1 character |
| **Lowercase** | At least 1 character |
| **Number** | At least 1 digit |
| **Special Character** | Optional (recommended) |
| **Common Passwords** | Blocked (e.g., "password123") |

### 3.2 Common Password Check

```python
# apps/accounts/utils.py
import hashlib

COMMON_PASSWORDS = [
    'password', '123456', 'qwerty', 'abc123',
    'password123', 'admin123', 'letmein'
]

def is_common_password(password):
    """Check if password is in common password list"""
    return password.lower() in COMMON_PASSWORDS

def check_pwned_password(password):
    """Check if password has been leaked (using haveibeenpwned)"""
    import requests
    
    sha1_hash = hashlib.sha1(password.encode()).hexdigest()
    response = requests.get(f'https://api.pwnedpasswords.com/v1/password/{sha1_hash}')
    
    if response.status_code ==
