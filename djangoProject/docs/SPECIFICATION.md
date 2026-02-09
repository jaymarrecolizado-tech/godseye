# Project Tracking Management System v2.0
## Complete Specification Document

**Version:** 2.0  
**Date:** February 2, 2026  
**Status:** Specification Phase  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Overview](#2-system-overview)
3. [Technology Stack](#3-technology-stack)
4. [Functional Requirements](#4-functional-requirements)
5. [Non-Functional Requirements](#5-non-functional-requirements)
6. [User Roles & Permissions](#6-user-roles--permissions)
7. [Feature Checklist](#7-feature-checklist)
8. [Acceptance Criteria](#8-acceptance-criteria)

---

## 1. Executive Summary

### 1.1 Purpose
Recreate existing Project Tracking Management System with modern technologies, improved performance, scalability, and enhanced user experience. The system tracks government infrastructure projects across different regions with geospatial visualization.

### 1.2 Key Goals
- **Modern UI/UX**: Contemporary, responsive design with smooth animations
- **Performance**: Sub-second API responses, optimized rendering
- **Scalability**: Support for 10x growth in users and projects
- **Developer Experience**: Type-safe, automated testing, modern tooling

### 1.3 Scope
- Full-stack web application for project tracking
- Geospatial visualization with interactive maps
- Bulk data import/export capabilities
- Real-time collaboration and notifications
- Comprehensive reporting and analytics
- User management with role-based access control

---

## 2. System Overview

### 2.1 System Purpose
The Project Tracking Management System enables government agencies to:
- Track infrastructure projects across multiple regions
- Visualize project locations on interactive maps
- Import bulk project data via CSV files
- Generate reports and analytics
- Monitor project status and progress in real-time
- Manage users with different permission levels

### 2.2 Current System Analysis
**Existing Stack:**
- Frontend: React 18 + Vite + Tailwind CSS + Leaflet
- Backend: Node.js + Express.js + MySQL2 + Socket.io
- Database: MySQL 8.0 with spatial extensions

**Pain Points to Address:**
- Manual state management (improved with TanStack Query)
- Basic map functionality (upgrade to MapLibre GL JS)
- Limited offline capabilities
- Monolithic API structure (better separation of concerns)

### 2.3 Target Users
- **Admin**: Full system access, user management, configuration
- **Manager**: Project oversight, reports, bulk operations
- **Editor**: Project CRUD operations, data import
- **Viewer**: Read-only access, view reports

---

## 3. Technology Stack

### 3.1 Frontend Stack

| Component | Technology | Version | Rationale |
|-----------|-----------|---------|-----------|
| **Framework** | React | 18.3+ | Mature ecosystem, large community |
| **Build Tool** | Vite | 5.4+ | Fast HMR, optimized builds |
| **Language** | TypeScript | 5.3+ | Type safety, better DX |
| **Routing** | React Router | 6.20+ | Declarative routing, data APIs |
| **State Management** | Zustand | 4.4+ | Lightweight, no boilerplate |
| **Server State** | TanStack Query | 5.12+ | Caching, synchronization, optimistic updates |
| **Styling** | Tailwind CSS | 3.4+ | Utility-first, highly customizable |
| **UI Components** | shadcn/ui | latest | Modern, accessible, Radix-based |
| **Form Handling** | React Hook Form | 7.48+ | Performant, minimal re-renders |
| **Validation** | Zod | 3.22+ | Type-safe validation |
| **Maps** | MapLibre GL JS | 4.1+ | WebGL-based, 3D support, vector tiles |
| **Charts** | Recharts | 2.10+ | React-native, composable |
| **HTTP Client** | Axios | 1.6+ | Interceptors, request/response transformers |
| **Date Handling** | date-fns | 3.0+ | Modular, tree-shakeable |
| **Icons** | Lucide React | 0.294+ | Beautiful, customizable |

### 3.2 Backend Stack

| Component | Technology | Version | Rationale |
|-----------|-----------|---------|-----------|
| **Language** | Python | 3.11+ | Modern syntax, rich ecosystem |
| **Framework** | Django | 5.0+ | Batteries-included, mature, secure |
| **API Framework** | Django REST Framework | 3.14+ | Powerful serialization, permissions |
| **Database** | MySQL | 8.0+ | Keep existing, spatial extensions |
| **ORM** | Django ORM | Built-in | Type-safe, migrations, admin panel |
| **Authentication** | Django Auth | Built-in | Session-based, extensible |
| **API Documentation** | drf-spectacular | 0.27+ | OpenAPI 3.0, auto-generated |
| **Real-time** | Django Channels | 4.0+ | Native WebSocket support |
| **Task Queue** | Celery | 5.3+ | Distributed task processing |
| **Cache** | Redis | 7.2+ | Fast in-memory caching |
| **Data Processing** | Pandas | 2.1+ | Powerful CSV/data manipulation |
| **CORS** | django-cors-headers | 4.3+ | Easy CORS configuration |
| **Rate Limiting** | django-ratelimit | 4.1+ | API throttling |

---

## 4. Functional Requirements

### 4.1 Authentication & Authorization

#### FR-1 User Authentication
- **FR-1.1**: Users can login with username/email and password
- **FR-1.2**: Passwords are hashed using bcrypt with minimum 12 rounds
- **FR-1.3**: Session management with secure, httpOnly cookies
- **FR-1.4**: Automatic logout after 30 minutes of inactivity
- **FR-1.5**: Password reset functionality via email
- **FR-1.6**: Password complexity: Minimum 8 characters, one uppercase, one lowercase, one number

**Implementation Notes:**
- Use Django's built-in authentication system
- Configure `SESSION_COOKIE_AGE = 1800` (30 minutes)
- Use `django.contrib.auth.hashers.BCryptPasswordHasher`

**Testing Checklist:**
- [ ] User can login with valid credentials
- [ ] Invalid credentials are rejected
- [ ] Session expires after 30 minutes of inactivity
- [ ] Password meets complexity requirements
- [ ] Passwords are hashed before storage

#### FR-2 Role-Based Access Control (RBAC)
- **FR-2.1**: Four roles: Admin, Manager, Editor, Viewer
- **FR-2.2**: Admin: Full access to all features
- **FR-2.3**: Manager: Read/write projects, view reports, manage users
- **FR-2.4**: Editor: Read/write projects, import data
- **FR-2.5**: Viewer: Read-only access to projects and reports

**Implementation Notes:**
- Create `UserRole` choices in User model
- Use Django permissions or custom permission classes
- Decorate views with `@permission_required` or DRF permission classes

**Testing Checklist:**
- [ ] Admin can access all endpoints
- [ ] Manager cannot delete users (only Admin)
- [ ] Editor cannot access user management
- [ ] Viewer cannot create/update/delete projects
- [ ] Role changes take effect immediately

### 4.2 Project Management

#### FR-3 Project CRUD Operations
- **FR-3.1**: Create new project sites with validation
- **FR-3.2**: Update existing project details
- **FR-3.3**: Delete projects (soft delete with admin approval)
- **FR-3.4**: View single project details with history
- **FR-3.5**: List projects with pagination (default 50 per page)

**Implementation Notes:**
- Use Django REST Framework ViewSets for CRUD
- Implement soft delete with `is_deleted` flag
- Use Django pagination (`PageNumberPagination`)
- Validate site code format (regex: `^[A-Z]+-[A-Z]+-\d+[A-Z]?$`)

**Testing Checklist:**
- [ ] Project creation validates all required fields
- [ ] Site code format is validated
- [ ] Update changes are persisted
- [ ] Soft delete sets flag without removing record
- [ ] Pagination returns correct number of items

#### FR-4 Project Filtering & Search
- **FR-4.1**: Filter by project type
- **FR-4.2**: Filter by status (Pending, In Progress, Done, Cancelled, On Hold)
- **FR-4.3**: Filter by province, municipality, barangay
- **FR-4.4**: Filter by date range (activation date)
- **FR-4.5**: Search by site code or site name
- **FR-4.6**: Combine multiple filters with AND logic

**Implementation Notes:**
- Use `django-filter` for filtering
- Implement search with `icontains` for case-insensitive matching
- Use Django Q objects for complex AND/OR queries

**Testing Checklist:**
- [ ] Each filter works independently
- [ ] Multiple filters work together (AND logic)
- [ ] Search matches site_code OR site_name
- [ ] Date range filters inclusive of boundaries
- [ ] Filters a
