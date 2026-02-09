# Testing Strategy & Guidelines

**Version:** 2.0  
**Date:** February 2, 2026  

---

## Table of Contents

1. [Testing Philosophy](#1-testing-philosophy)
2. [Backend Testing](#2-backend-testing)
3. [Frontend Testing](#3-frontend-testing)
4. [E2E Testing](#4-e2e-testing)
5. [Coverage Requirements](#5-coverage-requirements)
6. [CI/CD Integration](#6-cicd-integration)

---

## 1. Testing Philosophy

### 1.1 Testing Pyramid

```
        /\
       /  \
      / E2E \   High cost, slow
     /________\  Tests user flows
    /          \
   /   Integration \ Medium cost, medium speed
  /_____________\ Tests API contracts
 /                \
/   Unit Tests     \ Low cost, fast
/_____________________\ Tests individual functions
```

### 1.2 Test Type Distribution

| Test Type | Target Coverage | Frequency | Duration |
|-----------|----------------|----------|-----------|
| **Unit** | >60% | Every commit | <1s each |
| **Integration** | >20% | Every commit | <5s each |
| **E2E** | >10% | Every PR | <2m each |

### 1.3 Testing Best Practices

1. **Write tests first** (TDD when possible)
2. **Keep tests isolated** - No dependencies between tests
3. **Use descriptive names** - Test should document what it does
4. **Arrange-Act-Assert** pattern
5. **One assertion per test** when practical
6. **Mock external dependencies** - API calls, databases
7. **Test edge cases** - Empty lists, null values, invalid inputs
8. **Run tests in CI** - Prevent broken code

---

## 2. Backend Testing

### 2.1 pytest Configuration

**pytest.ini (backend/pytest.ini):**
```ini
[pytest]
DJANGO_SETTINGS_MODULE = config.settings.development
python_files = tests.py test_*.py *_tests.py
addopts =
    --verbose
    --tb=short
    --strict-markers
    --disable-warnings
testpaths = apps
markers =
    unit: Unit tests
    integration: Integration tests
    slow: Slow tests
```

### 2.2 Unit Tests Structure

**apps/projects/tests.py:**
```python
import pytest
from django.contrib.auth import get_user_model
from apps.projects.models import ProjectSite, ProjectType
from apps.projects.serializers import ProjectSiteSerializer

User = get_user_model()

@pytest.mark.django_db
class TestProjectModel:
    """Test ProjectSite model"""
    
    def test_create_project(self):
        """Test creating a new project"""
        project_type = ProjectType.objects.create(
            name="Test Type",
            code_prefix="TEST",
            color_code="#007bff"
        )
        project = ProjectSite.objects.create(
            site_code="TEST-001",
            project_type=project_type,
            site_name="Test Site",
            latitude=15.0,
            longitude=120.0
        )
        assert project.site_code == "TEST-001"
        assert project.site_name == "Test Site"
        assert str(project.project_type) == "Test Type"
    
    def test_site_code_validation(self):
        """Test site code format validation"""
        # Valid formats
        valid_codes = [
            "UNDP-GI-0009A",
            "CYBER-1231231",
            "eLGU-1231231"
        ]
        for code in valid_codes:
            # Should not raise validation error
            project = ProjectSite(site_code=code, ...)
            project.full_clean()  # Validate all fields
    
    def test_invalid_site_code(self):
        """Test invalid site code is rejected"""
        with pytest.raises(ValidationError):
            project = ProjectSite(
                site_code="INVALID-FORMAT",
                ...
            )
            project.full_clean()
    
    @pytest.mark.django_db
    def test_soft_delete(self):
        """Test soft delete functionality"""
        project = ProjectSite.objects.create(...)
        project_id = project.id
        
        # Soft delete
        project.is_deleted = True
        project.save()
        
        # Should still exist in database
        assert ProjectSite.objects.filter(id=project_id).exists()
        
        # But should be filtered out by default queryset
        assert not ProjectSite.objects.filter(id=project_id, is_deleted=False).exists()

@pytest.mark.django_db
class TestProjectSerializer:
    """Test ProjectSiteSerializer"""
    
    def test_valid_data(self):
        """Test serialization with valid data"""
        data = {
            "site_code": "TEST-001",
            "site_name": "Test Site",
            "project_type": 1,
            "latitude": 15.0,
            "longitude": 120.0,
            "status": "Pending"
        }
        serializer = ProjectSiteSerializer(data=data)
        assert serializer.is_valid()
        project = serializer.save()
        assert project.site_code == "TEST-001"
    
    def test_required_fields(self):
        """Test required fields"""
        serializer = ProjectSiteSerializer(data={})
        assert not serializer.is_valid()
        assert 'site_code' in serializer.errors
        assert 'site_name' in serializer.errors
        assert 'latitude' in serializer.errors
        assert 'longitude' in serializer.errors
```

### 2.3 Integration Tests

**apps/projects/tests/test_views.py:**
```python
import pytest
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from apps.projects.models import ProjectSite

User = get_user_model()

@pytest.mark.django_db
class TestProjectAPI:
    """Test Project API endpoints"""
    
    @pytest.fixture
    def api_client(self):
        return APIClient()
    
    @pytest.fixture
    def authenticated_client(self, api_client):
        user = User.objects.create_user(
            username="testuser",
            password="testpass123"
        )
        api_client.force_authenticate(user=user)
        return api_client
    
    def test_list_projects_unauthenticated(self, api_client):
        """Test listing projects without authentication"""
        response = api_client.get('/api/v1/projects/')
        assert response.status_code == 401
    
    def test_list_projects_authenticated(self, authenticated_client):
        """Test listing projects with authentication"""
        response = authenticated_client.get('/api/v1/projects/')
        assert response.status_code == 200
        assert 'results' in response.data
    
    def test_create_project_editor(self, authenticated_client):
        """Test creating project with Editor role"""
        authenticated_client.user.role = 'Editor'
        response = authenticated_client.post('/api/v1/projects/', {
            "site_code": "TEST-001",
            "site_name": "Test Site",
            "project_type": 1,
            "latitude": 15.0,
            "longitude": 120.0
        })
        assert response.status_code == 201
        assert 'data' in response.data
    
    def test_create_project_viewer(self, authenticated_client):
        """Test creating project with Viewer role (should fail)"""
        authenticated_client.user.role = 'Viewer'
        response = authenticated_client.post('/api/v1/projects/', {
            "site_code": "TEST-001",
            "site_name": "Test Site",
            ...
        })
        assert response.status_code == 403
    
    def test_filter_by_status(self, authenticated_client):
        """Test filtering projects by status"""
        response = authenticated_client.get(
            '/api/v1/projects/',
            {'status': 'In Progress'}
        )
        assert response.status_code == 200
        # Verify all projects have correct status
        for project in response.data['data']['results']:
            assert project['status'] == 'In Progress'
```

### 2.4 Test Fixtures

**conftest.py:**
```python
import pytest
from django.contrib.auth import get_user_model
from apps.projects.models import ProjectSite, ProjectType

User = get_user_model()

@pytest.fixture
def db_setup():
    """Setup database with test data"""
    project_type = ProjectType.objects.create(
        name="Test Type",
        code_prefix="TEST",
        color_code="#007bff"
    )
    ProjectSite.objects.create(
        site_code="TEST-001",
        project_type=project_type,
        site_name="Test Site 1",
        latitude=15.0,
        longitude=120.0
    )
