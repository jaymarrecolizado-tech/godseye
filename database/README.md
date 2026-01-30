# Project Tracking Management System - Database Setup

This directory contains the MySQL database schema, migrations, and seed data for the Project Tracking Management System.

## Overview

The database is designed to support a geospatial project tracking system with the following features:
- **Full location hierarchy**: Province → District → Municipality → Barangay
- **Spatial indexing**: MySQL 8.0+ spatial extensions for geospatial queries
- **Audit logging**: Complete trail of all data changes
- **Project management**: Track project sites with coordinates and status
- **User management**: Role-based access control (RBAC)

## Requirements

- MySQL 8.0 or higher
- Spatial extensions enabled
- InnoDB storage engine
- utf8mb4_unicode_ci collation

## Quick Start

### 1. Enable Spatial Extensions

Before creating the database, ensure spatial extensions are enabled:

```sql
-- Run as MySQL root/admin user
SET GLOBAL innodb_file_per_table = 1;
```

### 2. Create Database

```sql
CREATE DATABASE project_tracking 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE project_tracking;
```

### 3. Run Schema

```bash
# Using MySQL CLI
mysql -u root -p project_tracking < database/schema.sql

# Or source from MySQL client
SOURCE database/schema.sql;
```

### 4. Seed Data

Run seed files in order:

```bash
# 1. Location data (provinces, districts, municipalities, barangays)
mysql -u root -p project_tracking < database/seeds/location_data.sql

# 2. Project types
mysql -u root -p project_tracking < database/seeds/project_types.sql

# 3. Sample projects
mysql -u root -p project_tracking < database/seeds/sample_projects.sql
```

Or from MySQL client:

```sql
USE project_tracking;
SOURCE database/seeds/location_data.sql;
SOURCE database/seeds/project_types.sql;
SOURCE database/seeds/sample_projects.sql;
```

## Database Structure

### Tables

| Table | Description |
|-------|-------------|
| `provinces` | Top-level administrative divisions with spatial data |
| `districts` | Legislative districts within provinces |
| `municipalities` | Cities and municipalities with spatial centroids |
| `barangays` | Smallest administrative units with spatial centroids |
| `project_types` | Project categories (UNDP, CYBER, IIDB, eLGU) |
| `project_sites` | Main project data with coordinates and status |
| `project_status_history` | Audit trail of status changes |
| `users` | System users with RBAC |
| `audit_logs` | Comprehensive audit trail |
| `csv_imports` | CSV import job tracking |

### Views

| View | Description |
|------|-------------|
| `project_summary_view` | Denormalized view for reports and dashboard |

### Triggers

| Trigger | Event | Description |
|---------|-------|-------------|
| `trg_project_sites_insert` | AFTER INSERT | Logs new project creation |
| `trg_project_sites_update` | AFTER UPDATE | Logs updates and status changes |
| `trg_project_sites_delete` | BEFORE DELETE | Logs project deletions |

## Spatial Data

All spatial data uses **SRID 4326** (WGS 84) coordinate system.

### Spatial Indexes

- `provinces.centroid` - SPATIAL INDEX
- `provinces.boundary` - SPATIAL INDEX
- `municipalities.centroid` - SPATIAL INDEX
- `barangays.centroid` - SPATIAL INDEX
- `project_sites.location` - SPATIAL INDEX

### Common Spatial Queries

```sql
-- Find projects within 10km radius
SELECT 
    site_code,
    site_name,
    ST_Distance_Sphere(location, ST_GeomFromText('POINT(121.804235 20.728794)', 4326)) / 1000 AS distance_km
FROM project_sites
WHERE ST_Distance_Sphere(location, ST_GeomFromText('POINT(121.804235 20.728794)', 4326)) <= 10000
ORDER BY distance_km;

-- Find projects within bounding box (map viewport)
SELECT * FROM project_sites
WHERE MBRContains(
    ST_GeomFromText('Polygon((121.0 20.0, 122.0 20.0, 122.0 21.0, 121.0 21.0, 121.0 20.0))'),
    location
);

-- Update spatial point from lat/lng
UPDATE project_sites 
SET location = ST_GeomFromText(CONCAT('POINT(', longitude, ' ', latitude, ')'), 4326)
WHERE location IS NULL;
```

## Seeded Data

### Provinces
- Batanes (Region 02)
- Cagayan (Region 02)

### Districts
- District I (Batanes)
- District III (Cagayan)

### Municipalities
- Itbayat (Batanes)
- Ivana (Batanes)
- Iguig (Cagayan)

### Barangays
- Raele, Santa Lucia, Santa Maria (Itbayat)
- Salagao (Ivana)
- Ajat (Iguig)

### Project Types
| Name | Prefix | Color |
|------|--------|-------|
| Free-WIFI for All | UNDP | #28a745 (Green) |
| PNPKI/CYBER | CYBER | #dc3545 (Red) |
| IIDB | IIDB | #007bff (Blue) |
| DigiGov-eLGU | eLGU | #ffc107 (Yellow) |

### Sample Projects (10 total)
- 7 Free-WIFI projects in Batanes
- 3 projects (CYBER, IIDB, eLGU) in Cagayan

## Migration Usage

### Run Migration

```bash
mysql -u root -p project_tracking < database/migrations/001_initial_schema.sql
```

### Rollback Migration

Edit the migration file and uncomment the DOWN MIGRATION section, then run:

```bash
mysql -u root -p project_tracking < database/migrations/001_initial_schema.sql
```

## Environment Configuration

Create a `.env` file in your application root:

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=project_tracking
DB_USER=root
DB_PASSWORD=your_password
DB_POOL_SIZE=10
```

## Troubleshooting

### Spatial Extensions Not Enabled

If you encounter errors about spatial indexes, ensure:

```sql
-- Check if spatial is enabled
SHOW VARIABLES LIKE 'innodb_file_per_table';

-- Should return: ON
```

### Permission Issues

Ensure the database user has appropriate permissions:

```sql
GRANT ALL PRIVILEGES ON project_tracking.* TO 'your_user'@'localhost';
FLUSH PRIVILEGES;
```

### Foreign Key Errors When Seeding

Run seed files in the correct order:
1. `location_data.sql` (provinces → districts → municipalities → barangays)
2. `project_types.sql`
3. `sample_projects.sql`

## File Structure

```
database/
├── schema.sql                    # Complete database schema
├── migrations/
│   └── 001_initial_schema.sql   # Migration version of schema
├── seeds/
│   ├── location_data.sql        # Provinces, districts, municipalities, barangays
│   ├── project_types.sql        # Project type definitions
│   └── sample_projects.sql      # Sample project data
└── README.md                    # This file
```

## Additional Notes

### Audit Logging

The system uses `@current_user_id` session variable to track which user made changes. Set this in your application before database operations:

```sql
SET @current_user_id = 123;  -- Replace with actual user ID
```

### JSON Columns

Several tables use JSON columns for flexible data storage:
- `project_sites.metadata` - Additional project data
- `audit_logs.old_values` / `new_values` - Change tracking
- `csv_imports.errors` - Import error details

### Character Set

All tables use `utf8mb4_unicode_ci` to support:
- Full Unicode (including emojis)
- Proper sorting for multiple languages
- Case-insensitive comparisons

## Support

For issues or questions regarding the database schema, refer to:
- Architecture Document: `plans/PROJECT_TRACKING_SYSTEM_ARCHITECTURE.md`
- MySQL 8.0 Spatial Reference: https://dev.mysql.com/doc/refman/8.0/en/spatial-types.html
