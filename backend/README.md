# Project Tracking Management System - Backend API

A comprehensive REST API for managing and tracking project sites with geospatial capabilities, built with Node.js, Express, and MySQL.

## Features

- ✅ Full CRUD operations for project sites
- ✅ Geospatial queries with MySQL spatial extensions
- ✅ Real-time updates via WebSocket (Socket.io)
- ✅ Comprehensive reporting and analytics
- ✅ Input validation with express-validator
- ✅ Standardized API responses
- ✅ Pagination and filtering support
- ✅ GeoJSON output for map integration

## Prerequisites

- Node.js 18+ 
- MySQL 8.0+ (with spatial extensions enabled)
- npm or yarn

## Installation

1. **Clone and navigate to the backend directory:**
```bash
cd backend
```

2. **Install dependencies:**
```bash
npm install
```

3. **Configure environment variables:**
```bash
cp .env.example .env.local
# Edit .env.local with your database credentials
```

4. **Set up the database:**
- Create a MySQL database named `project_tracking`
- Run the schema from `../database/schema.sql`
- (Optional) Seed sample data from `../database/seeds/`

5. **Start the development server:**
```bash
npm run dev
```

The API will be available at `http://localhost:3001`

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3001 |
| `NODE_ENV` | Environment mode | development |
| `DB_HOST` | MySQL host | localhost |
| `DB_PORT` | MySQL port | 3306 |
| `DB_NAME` | Database name | project_tracking |
| `DB_USER` | Database user | root |
| `DB_PASSWORD` | Database password | - |
| `DB_POOL_SIZE` | Connection pool size | 10 |
| `JWT_SECRET` | JWT signing secret | - |
| `CORS_ORIGIN` | Allowed CORS origin | http://localhost:3000 |

## API Documentation

### Base URL
```
http://localhost:3001/api
```

### Response Format

All responses follow a standardized format:

**Success:**
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "error": "Error Type",
  "message": "Detailed error message",
  "details": [ ... ] // Validation errors (optional)
}
```

**Paginated:**
```json
{
  "success": true,
  "message": "Data retrieved",
  "data": [ ... ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 150,
      "totalPages": 3,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

---

## Endpoints

### Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Check API status |

---

### Projects

#### List Projects
```http
GET /api/projects?page=1&limit=50&status=Done&province_id=1
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | integer | Page number (default: 1) |
| `limit` | integer | Items per page (max: 100) |
| `status` | string | Filter by status |
| `project_type_id` | integer | Filter by project type |
| `province_id` | integer | Filter by province |
| `municipality_id` | integer | Filter by municipality |
| `barangay_id` | integer | Filter by barangay |
| `date_from` | date | Filter from date (YYYY-MM-DD) |
| `date_to` | date | Filter to date (YYYY-MM-DD) |
| `search` | string | Search by site_code or site_name |

#### Get Single Project
```http
GET /api/projects/:id
```

#### Create Project
```http
POST /api/projects
```

**Request Body:**
```json
{
  "site_code": "UNDP-GI-0001",
  "project_type_id": 1,
  "site_name": "Sample Site",
  "province_id": 1,
  "municipality_id": 1,
  "barangay_id": 1,
  "district_id": 1,
  "latitude": 14.5995,
  "longitude": 120.9842,
  "activation_date": "2024-01-15",
  "status": "Pending",
  "remarks": "Sample remarks"
}
```

#### Update Project
```http
PUT /api/projects/:id
```

#### Delete Project
```http
DELETE /api/projects/:id
```

#### Get Project Status History
```http
GET /api/projects/:id/history
```

---

### Geospatial

#### Get Map Data (GeoJSON)
```http
GET /api/map-data?status=Done&province_id=1
```

Returns all projects as a GeoJSON FeatureCollection for map display.

**Response:**
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [120.9842, 14.5995]
      },
      "properties": {
        "id": 1,
        "site_code": "UNDP-GI-0001",
        "site_name": "Sample Site",
        "status": "Done",
        "color_code": "#28a745"
      }
    }
  ]
}
```

#### Find Nearby Projects
```http
GET /api/projects/nearby?lat=14.5995&lng=120.9842&radius=10
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `lat` | float | Latitude (required) |
| `lng` | float | Longitude (required) |
| `radius` | float | Radius in km (default: 10) |
| `page` | integer | Page number |
| `limit` | integer | Items per page |

#### Get Projects in Bounding Box
```http
POST /api/projects/bounding-box
```

**Request Body:**
```json
{
  "north": 15.0,
  "south": 14.0,
  "east": 121.5,
  "west": 120.5,
  "filters": {
    "status": "Done",
    "project_type_id": 1
  }
}
```

#### Get Project Clusters (for Heatmap)
```http
GET /api/clusters?precision=2&status=Done
```

---

### Reference Data

#### Get Provinces
```http
GET /api/provinces?include_stats=true&region_code=02
```

#### Get Municipalities
```http
GET /api/municipalities?province_id=1&include_stats=true
```

#### Get Barangays
```http
GET /api/barangays?municipality_id=1&include_stats=true
```

#### Get Districts
```http
GET /api/districts?province_id=1
```

#### Get Project Types
```http
GET /api/project-types?include_stats=true
```

#### Get Location Hierarchy
```http
GET /api/location-hierarchy?province_id=1
```

#### Search Locations
```http
GET /api/search-locations?q=Manila&type=all
```

---

### Reports

#### Dashboard Summary
```http
GET /api/reports/summary?date_from=2024-01-01&date_to=2024-12-31
```

#### Status Breakdown
```http
GET /api/reports/by-status?group_by=project_type
```

**Group By Options:** `project_type`, `province`, `overall`

#### Location Breakdown
```http
GET /api/reports/by-location?level=province
```

**Level Options:** `province`, `municipality`

#### Timeline Report
```http
GET /api/reports/timeline?group_by=month
```

**Group By Options:** `month`, `quarter`, `year`, `week`

#### Project Type Analysis
```http
GET /api/reports/by-project-type
```

#### Performance Metrics
```http
GET /api/reports/performance
```

---

## WebSocket Events

Connect to Socket.io at `ws://localhost:3001`

### Client Events (Send)

| Event | Description |
|-------|-------------|
| `subscribe:projects` | Subscribe to project updates |
| `unsubscribe:projects` | Unsubscribe from project updates |
| `subscribe:imports` | Subscribe to import progress |

### Server Events (Receive)

| Event | Data | Description |
|-------|------|-------------|
| `project:created` | Project object | New project added |
| `project:updated` | Project object | Project modified |
| `project:deleted` | `{ id, site_code }` | Project removed |
| `import:progress` | `{ importId, progress }` | Import progress update |
| `import:completed` | `{ importId, status }` | Import finished |

---

## Status Enum

| Status | Description |
|--------|-------------|
| `Pending` | Project awaiting activation |
| `In Progress` | Project currently active |
| `Done` | Project completed |
| `Cancelled` | Project cancelled |
| `On Hold` | Project temporarily suspended |

---

## Project Types

The system supports the following project types (configurable):

| Name | Code Prefix | Default Color |
|------|-------------|---------------|
| Free-WIFI for All | UNDP | #28a745 |
| PNPKI/CYBER | CYBER | #dc3545 |
| IIDB | IIDB | #007bff |
| DigiGov-eLGU | eLGU | #ffc107 |

---

## Error Codes

| HTTP Status | Error Type | Description |
|-------------|------------|-------------|
| 200 | OK | Success |
| 201 | Created | Resource created |
| 400 | Bad Request | Invalid request |
| 401 | Unauthorized | Authentication required |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource already exists |
| 422 | Validation Error | Input validation failed |
| 500 | Internal Server Error | Server error |

---

## Development

### Running in Development Mode
```bash
npm run dev
```

### Running in Production Mode
```bash
npm start
```

### Database Connection Pool

The API uses a MySQL connection pool with the following defaults:
- **Pool Size:** 10 connections
- **Queue Limit:** Unlimited (0)
- **Timeout:** 60 seconds

### Spatial Queries

The API uses MySQL spatial extensions for geospatial operations:
- `ST_GeomFromText()` - Create spatial points
- `ST_Distance_Sphere()` - Calculate accurate distances
- `MBRContains()` - Bounding box queries
- Spatial indexes on `location` column for performance

---

## Folder Structure

```
backend/
├── src/
│   ├── config/
│   │   └── database.js       # MySQL connection pool
│   ├── middleware/
│   │   └── validation.js     # Input validation rules
│   ├── routes/
│   │   ├── projects.js       # Project CRUD endpoints
│   │   ├── geospatial.js     # Map data & spatial queries
│   │   ├── reference.js      # Lookup data endpoints
│   │   └── reports.js        # Reporting endpoints
│   ├── utils/
│   │   └── response.js       # Response helpers
│   └── server.js             # Main entry point
├── uploads/                  # File uploads directory
├── .env.example              # Environment template
├── .env.local                # Local environment (gitignored)
├── package.json
└── README.md
```

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

---

## License

MIT License
