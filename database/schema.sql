-- =============================================================================
-- Project Tracking Management System - Complete Database Schema
-- =============================================================================
-- This schema provides the foundation for a geospatial project tracking system
-- with MySQL 8.0+ spatial extensions support.
--
-- Features:
-- - Full location hierarchy (Province → District → Municipality → Barangay)
-- - Project management with spatial indexing
-- - Audit logging and status history tracking
-- - CSV import capabilities
-- - User management with RBAC
-- =============================================================================

-- Enable spatial extensions (must be run by MySQL admin)
-- SET GLOBAL innodb_file_per_table = 1;

-- Drop existing database if exists and create new
-- DROP DATABASE IF EXISTS project_tracking;
-- CREATE DATABASE project_tracking CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE project_tracking;

-- =============================================================================
-- LOCATION HIERARCHY TABLES
-- =============================================================================

-- Provinces table - Top level administrative division
CREATE TABLE IF NOT EXISTS provinces (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Primary key',
    name VARCHAR(100) NOT NULL COMMENT 'Province name',
    region_code VARCHAR(10) COMMENT 'Region code (e.g., 02 for Region II)',
    centroid POINT SRID 4326 COMMENT 'Geographic center of province (WGS 84)',
    boundary POLYGON SRID 4326 COMMENT 'Province boundary polygon (WGS 84)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation timestamp',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update timestamp',
    
    INDEX idx_name (name),
    SPATIAL INDEX idx_centroid (centroid) COMMENT 'Spatial index for centroid queries',
    SPATIAL INDEX idx_boundary (boundary) COMMENT 'Spatial index for boundary queries'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Provinces table with spatial data support';

-- Districts table - Legislative districts within provinces
CREATE TABLE IF NOT EXISTS districts (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Primary key',
    province_id INT NOT NULL COMMENT 'Foreign key to provinces',
    name VARCHAR(50) NOT NULL COMMENT 'District name (e.g., District I)',
    district_code VARCHAR(20) COMMENT 'District code for reference',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation timestamp',
    
    FOREIGN KEY (province_id) REFERENCES provinces(id) ON DELETE CASCADE,
    INDEX idx_province (province_id),
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Legislative districts table';

-- Municipalities table - Cities and municipalities
CREATE TABLE IF NOT EXISTS municipalities (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Primary key',
    province_id INT NOT NULL COMMENT 'Foreign key to provinces',
    district_id INT COMMENT 'Foreign key to districts (nullable)',
    name VARCHAR(100) NOT NULL COMMENT 'Municipality name',
    municipality_code VARCHAR(20) COMMENT 'Municipality code for reference',
    centroid POINT SRID 4326 COMMENT 'Geographic center of municipality (WGS 84)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation timestamp',
    
    FOREIGN KEY (province_id) REFERENCES provinces(id) ON DELETE CASCADE,
    FOREIGN KEY (district_id) REFERENCES districts(id) ON DELETE SET NULL,
    INDEX idx_province (province_id),
    INDEX idx_district (district_id),
    INDEX idx_name (name),
    SPATIAL INDEX idx_centroid (centroid) COMMENT 'Spatial index for map clustering'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Municipalities/Cities table';

-- Barangays table - Smallest administrative unit
CREATE TABLE IF NOT EXISTS barangays (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Primary key',
    municipality_id INT NOT NULL COMMENT 'Foreign key to municipalities',
    name VARCHAR(100) NOT NULL COMMENT 'Barangay name',
    barangay_code VARCHAR(20) COMMENT 'Barangay code for reference',
    centroid POINT SRID 4326 COMMENT 'Geographic center of barangay (WGS 84)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation timestamp',
    
    FOREIGN KEY (municipality_id) REFERENCES municipalities(id) ON DELETE CASCADE,
    INDEX idx_municipality (municipality_id),
    INDEX idx_name (name),
    SPATIAL INDEX idx_centroid (centroid) COMMENT 'Spatial index for precise location'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Barangays table';

-- =============================================================================
-- PROJECT MANAGEMENT TABLES
-- =============================================================================

-- Project types table - Categorization of projects
CREATE TABLE IF NOT EXISTS project_types (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Primary key',
    name VARCHAR(100) NOT NULL COMMENT 'Project type name',
    code_prefix VARCHAR(20) COMMENT 'Code prefix for site codes (e.g., UNDP, CYBER)',
    description TEXT COMMENT 'Detailed description of project type',
    color_code VARCHAR(7) DEFAULT '#007bff' COMMENT 'Hex color for map markers',
    icon_url VARCHAR(255) COMMENT 'URL to icon image',
    is_active BOOLEAN DEFAULT TRUE COMMENT 'Whether this type is currently active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation timestamp',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update timestamp',
    
    UNIQUE KEY uk_name (name),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Project types/categories';

-- Project sites table - Main project data with spatial coordinates
CREATE TABLE IF NOT EXISTS project_sites (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Primary key',
    site_code VARCHAR(30) NOT NULL COMMENT 'Unique site identifier (e.g., UNDP-GI-0009A)',
    project_type_id INT NOT NULL COMMENT 'Foreign key to project_types',
    site_name VARCHAR(150) NOT NULL COMMENT 'Name of the specific site/location',
    barangay_id INT COMMENT 'Foreign key to barangays (nullable)',
    municipality_id INT NOT NULL COMMENT 'Foreign key to municipalities',
    province_id INT NOT NULL COMMENT 'Foreign key to provinces',
    district_id INT COMMENT 'Foreign key to districts (nullable)',
    latitude DECIMAL(10, 8) NOT NULL COMMENT 'Latitude coordinate (-90 to 90)',
    longitude DECIMAL(11, 8) NOT NULL COMMENT 'Longitude coordinate (-180 to 180)',
    location POINT SRID 4326 NOT NULL COMMENT 'Spatial point (WGS 84) for geospatial queries',
    activation_date DATE COMMENT 'Project activation/start date',
    status ENUM('Pending', 'In Progress', 'Done', 'Cancelled', 'On Hold') DEFAULT 'Pending' COMMENT 'Current project status',
    remarks TEXT COMMENT 'Additional notes or comments',
    metadata JSON COMMENT 'Flexible metadata storage (JSON)',
    created_by INT COMMENT 'User ID who created the record',
    updated_by INT COMMENT 'User ID who last updated the record',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation timestamp',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update timestamp',
    
    FOREIGN KEY (project_type_id) REFERENCES project_types(id) ON DELETE RESTRICT,
    FOREIGN KEY (barangay_id) REFERENCES barangays(id) ON DELETE SET NULL,
    FOREIGN KEY (municipality_id) REFERENCES municipalities(id) ON DELETE RESTRICT,
    FOREIGN KEY (province_id) REFERENCES provinces(id) ON DELETE RESTRICT,
    FOREIGN KEY (district_id) REFERENCES districts(id) ON DELETE SET NULL,
    
    UNIQUE KEY uk_site_code (site_code),
    INDEX idx_site_code (site_code),
    INDEX idx_project_type (project_type_id),
    INDEX idx_status (status),
    INDEX idx_activation_date (activation_date),
    INDEX idx_location_lookup (province_id, municipality_id, barangay_id),
    SPATIAL INDEX idx_location (location) COMMENT 'Spatial index for proximity queries'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Main project sites table with geospatial data';

-- =============================================================================
-- AUDIT & HISTORY TABLES
-- =============================================================================

-- Project status history table - Tracks all status changes
CREATE TABLE IF NOT EXISTS project_status_history (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Primary key',
    project_site_id INT NOT NULL COMMENT 'Foreign key to project_sites',
    old_status ENUM('Pending', 'In Progress', 'Done', 'Cancelled', 'On Hold') COMMENT 'Previous status',
    new_status ENUM('Pending', 'In Progress', 'Done', 'Cancelled', 'On Hold') NOT NULL COMMENT 'New status',
    reason TEXT COMMENT 'Reason for status change',
    changed_by INT COMMENT 'User ID who made the change',
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'When the change occurred',
    
    FOREIGN KEY (project_site_id) REFERENCES project_sites(id) ON DELETE CASCADE,
    INDEX idx_project (project_site_id),
    INDEX idx_changed_at (changed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Audit trail for project status changes';

-- Users table - System users with role-based access
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Primary key',
    username VARCHAR(50) NOT NULL COMMENT 'Unique username',
    email VARCHAR(100) NOT NULL COMMENT 'Unique email address',
    password_hash VARCHAR(255) NOT NULL COMMENT 'Bcrypt hashed password',
    full_name VARCHAR(100) NOT NULL COMMENT 'Full name of user',
    role ENUM('Admin', 'Manager', 'Editor', 'Viewer') DEFAULT 'Viewer' COMMENT 'User role for RBAC',
    is_active BOOLEAN DEFAULT TRUE COMMENT 'Whether account is active',
    last_login TIMESTAMP NULL COMMENT 'Last successful login timestamp',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Account creation timestamp',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update timestamp',
    
    UNIQUE KEY uk_username (username),
    UNIQUE KEY uk_email (email),
    INDEX idx_role (role),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='System users table';

-- Add foreign key constraints to project_sites for user references
ALTER TABLE project_sites
    ADD CONSTRAINT fk_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;

-- Audit logs table - Comprehensive audit trail
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT 'Primary key',
    user_id INT COMMENT 'User who performed the action (nullable for system)',
    table_name VARCHAR(50) NOT NULL COMMENT 'Affected table name',
    record_id INT NOT NULL COMMENT 'ID of affected record',
    action ENUM('CREATE', 'UPDATE', 'DELETE', 'IMPORT', 'EXPORT') NOT NULL COMMENT 'Action type',
    old_values JSON COMMENT 'Previous values (for updates/deletes)',
    new_values JSON COMMENT 'New values (for creates/updates)',
    ip_address VARCHAR(45) COMMENT 'Client IP address (supports IPv6)',
    user_agent VARCHAR(255) COMMENT 'Client user agent string',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'When the action occurred',
    
    INDEX idx_table_record (table_name, record_id),
    INDEX idx_user (user_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Comprehensive audit log';

-- =============================================================================
-- CSV IMPORT TRACKING
-- =============================================================================

-- CSV imports table - Track import jobs
CREATE TABLE IF NOT EXISTS csv_imports (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Primary key',
    filename VARCHAR(255) NOT NULL COMMENT 'Stored filename',
    original_filename VARCHAR(255) COMMENT 'Original uploaded filename',
    total_rows INT DEFAULT 0 COMMENT 'Total rows in CSV',
    success_count INT DEFAULT 0 COMMENT 'Successfully imported rows',
    error_count INT DEFAULT 0 COMMENT 'Rows with errors',
    errors JSON COMMENT 'Detailed error information',
    imported_by INT COMMENT 'User who initiated import',
    status ENUM('Pending', 'Processing', 'Completed', 'Failed', 'Partial') DEFAULT 'Pending' COMMENT 'Import status',
    started_at TIMESTAMP NULL COMMENT 'When processing started',
    completed_at TIMESTAMP NULL COMMENT 'When processing completed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation timestamp',
    
    FOREIGN KEY (imported_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_status (status),
    INDEX idx_imported_by (imported_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='CSV import job tracking';

-- =============================================================================
-- VIEWS FOR REPORTING
-- =============================================================================

-- Project summary view - Denormalized view for reports and dashboard
CREATE OR REPLACE VIEW project_summary_view AS
SELECT 
    ps.id,
    ps.site_code,
    ps.site_name,
    pt.name AS project_type,
    pt.code_prefix,
    pt.color_code,
    ps.status,
    ps.activation_date,
    ps.latitude,
    ps.longitude,
    ps.location,
    ST_X(ps.location) as longitude_val,
    ST_Y(ps.location) as latitude_val,
    b.name AS barangay,
    m.name AS municipality,
    p.name AS province,
    d.name AS district,
    ps.created_at,
    ps.updated_at,
    u1.full_name AS created_by_name,
    u2.full_name AS updated_by_name
FROM project_sites ps
JOIN project_types pt ON ps.project_type_id = pt.id
LEFT JOIN barangays b ON ps.barangay_id = b.id
JOIN municipalities m ON ps.municipality_id = m.id
JOIN provinces p ON ps.province_id = p.id
LEFT JOIN districts d ON ps.district_id = d.id
LEFT JOIN users u1 ON ps.created_by = u1.id
LEFT JOIN users u2 ON ps.updated_by = u2.id;

-- =============================================================================
-- TRIGGERS FOR AUDIT LOGGING
-- =============================================================================

-- Change delimiter for trigger creation
DELIMITER //

-- Trigger: Log new project site creation
CREATE TRIGGER IF NOT EXISTS trg_project_sites_insert
AFTER INSERT ON project_sites
FOR EACH ROW
BEGIN
    INSERT INTO audit_logs (user_id, table_name, record_id, action, new_values, created_at)
    VALUES (@current_user_id, 'project_sites', NEW.id, 'CREATE', JSON_OBJECT(
        'site_code', NEW.site_code,
        'site_name', NEW.site_name,
        'project_type_id', NEW.project_type_id,
        'status', NEW.status,
        'latitude', NEW.latitude,
        'longitude', NEW.longitude,
        'activation_date', NEW.activation_date
    ), NOW());
END//

-- Trigger: Log project site updates and status changes
CREATE TRIGGER IF NOT EXISTS trg_project_sites_update
AFTER UPDATE ON project_sites
FOR EACH ROW
BEGIN
    -- Log status change to history if status changed
    IF OLD.status != NEW.status THEN
        INSERT INTO project_status_history (project_site_id, old_status, new_status, changed_by, changed_at)
        VALUES (NEW.id, OLD.status, NEW.status, @current_user_id, NOW());
    END IF;
    
    -- Log to audit
    INSERT INTO audit_logs (user_id, table_name, record_id, action, old_values, new_values, created_at)
    VALUES (@current_user_id, 'project_sites', NEW.id, 'UPDATE', JSON_OBJECT(
        'site_code', OLD.site_code,
        'site_name', OLD.site_name,
        'status', OLD.status,
        'activation_date', OLD.activation_date,
        'remarks', OLD.remarks
    ), JSON_OBJECT(
        'site_code', NEW.site_code,
        'site_name', NEW.site_name,
        'status', NEW.status,
        'activation_date', NEW.activation_date,
        'remarks', NEW.remarks
    ), NOW());
END//

-- Trigger: Log project site deletions
CREATE TRIGGER IF NOT EXISTS trg_project_sites_delete
BEFORE DELETE ON project_sites
FOR EACH ROW
BEGIN
    INSERT INTO audit_logs (user_id, table_name, record_id, action, old_values, created_at)
    VALUES (@current_user_id, 'project_sites', OLD.id, 'DELETE', JSON_OBJECT(
        'site_code', OLD.site_code,
        'site_name', OLD.site_name,
        'project_type_id', OLD.project_type_id,
        'status', OLD.status,
        'latitude', OLD.latitude,
        'longitude', OLD.longitude,
        'activation_date', OLD.activation_date
    ), NOW());
END//

-- Reset delimiter
DELIMITER ;

-- =============================================================================
-- SPATIAL QUERY EXAMPLES (Documentation)
-- =============================================================================

/*
-- Find projects within radius (e.g., 10km from a point)
SELECT 
    site_code,
    site_name,
    ST_Distance_Sphere(location, ST_GeomFromText('POINT(121.804235 20.728794)', 4326)) / 1000 AS distance_km
FROM project_sites
WHERE ST_Distance_Sphere(location, ST_GeomFromText('POINT(121.804235 20.728794)', 4326)) <= 10000
ORDER BY distance_km;

-- Find projects within a bounding box (map viewport)
SELECT * FROM project_sites
WHERE MBRContains(
    ST_GeomFromText('Polygon((121.0 20.0, 122.0 20.0, 122.0 21.0, 121.0 21.0, 121.0 20.0))'),
    location
);

-- Cluster projects by proximity for heatmap
SELECT 
    ROUND(latitude, 2) as lat_grid,
    ROUND(longitude, 2) as lng_grid,
    COUNT(*) as project_count,
    GROUP_CONCAT(site_code) as sites
FROM project_sites
WHERE status = 'Done'
GROUP BY lat_grid, lng_grid;

-- Update location POINT column from lat/lng (after insert/update)
UPDATE project_sites 
SET location = ST_GeomFromText(CONCAT('POINT(', longitude, ' ', latitude, ')'), 4326)
WHERE location IS NULL;
*/

-- =============================================================================
-- SCHEMA COMPLETE
-- =============================================================================
