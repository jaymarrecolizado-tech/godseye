-- =============================================================================
-- Migration: 001_initial_schema
-- Description: Initial database schema for Project Tracking Management System
-- Author: System
-- Created: 2026-01-30
-- =============================================================================
-- This migration creates the complete database schema including:
-- - Location hierarchy tables (provinces, districts, municipalities, barangays)
-- - Project management tables (project_types, project_sites)
-- - Audit tables (project_status_history, audit_logs)
-- - User management (users)
-- - CSV import tracking (csv_imports)
-- - Views and triggers
-- =============================================================================

-- =============================================================================
-- UP MIGRATION
-- =============================================================================

-- Check if we should run this migration
-- (In production, use a migrations table to track executed migrations)

-- =============================================================================
-- STEP 1: LOCATION HIERARCHY TABLES
-- =============================================================================

-- Provinces table
CREATE TABLE IF NOT EXISTS provinces (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    region_code VARCHAR(10),
    centroid POINT SRID 4326,
    boundary POLYGON SRID 4326,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name),
    SPATIAL INDEX idx_centroid (centroid),
    SPATIAL INDEX idx_boundary (boundary)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Districts table
CREATE TABLE IF NOT EXISTS districts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    province_id INT NOT NULL,
    name VARCHAR(50) NOT NULL,
    district_code VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (province_id) REFERENCES provinces(id) ON DELETE CASCADE,
    INDEX idx_province (province_id),
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Municipalities table
CREATE TABLE IF NOT EXISTS municipalities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    province_id INT NOT NULL,
    district_id INT,
    name VARCHAR(100) NOT NULL,
    municipality_code VARCHAR(20),
    centroid POINT SRID 4326,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (province_id) REFERENCES provinces(id) ON DELETE CASCADE,
    FOREIGN KEY (district_id) REFERENCES districts(id) ON DELETE SET NULL,
    INDEX idx_province (province_id),
    INDEX idx_district (district_id),
    INDEX idx_name (name),
    SPATIAL INDEX idx_centroid (centroid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Barangays table
CREATE TABLE IF NOT EXISTS barangays (
    id INT AUTO_INCREMENT PRIMARY KEY,
    municipality_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    barangay_code VARCHAR(20),
    centroid POINT SRID 4326,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (municipality_id) REFERENCES municipalities(id) ON DELETE CASCADE,
    INDEX idx_municipality (municipality_id),
    INDEX idx_name (name),
    SPATIAL INDEX idx_centroid (centroid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- STEP 2: PROJECT MANAGEMENT TABLES
-- =============================================================================

-- Project types table
CREATE TABLE IF NOT EXISTS project_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code_prefix VARCHAR(20),
    description TEXT,
    color_code VARCHAR(7) DEFAULT '#007bff',
    icon_url VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_name (name),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Project sites table
CREATE TABLE IF NOT EXISTS project_sites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    site_code VARCHAR(30) NOT NULL UNIQUE,
    project_type_id INT NOT NULL,
    site_name VARCHAR(150) NOT NULL,
    barangay_id INT,
    municipality_id INT NOT NULL,
    province_id INT NOT NULL,
    district_id INT,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    location POINT SRID 4326 NOT NULL,
    activation_date DATE,
    status ENUM('Pending', 'In Progress', 'Done', 'Cancelled', 'On Hold') DEFAULT 'Pending',
    remarks TEXT,
    metadata JSON,
    created_by INT,
    updated_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (project_type_id) REFERENCES project_types(id) ON DELETE RESTRICT,
    FOREIGN KEY (barangay_id) REFERENCES barangays(id) ON DELETE SET NULL,
    FOREIGN KEY (municipality_id) REFERENCES municipalities(id) ON DELETE RESTRICT,
    FOREIGN KEY (province_id) REFERENCES provinces(id) ON DELETE RESTRICT,
    FOREIGN KEY (district_id) REFERENCES districts(id) ON DELETE SET NULL,
    INDEX idx_site_code (site_code),
    INDEX idx_project_type (project_type_id),
    INDEX idx_status (status),
    INDEX idx_activation_date (activation_date),
    INDEX idx_location_lookup (province_id, municipality_id, barangay_id),
    SPATIAL INDEX idx_location (location)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- STEP 3: USERS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role ENUM('Admin', 'Manager', 'Editor', 'Viewer') DEFAULT 'Viewer',
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_role (role),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add user foreign keys to project_sites
ALTER TABLE project_sites
    ADD CONSTRAINT fk_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;

-- =============================================================================
-- STEP 4: AUDIT & HISTORY TABLES
-- =============================================================================

-- Project status history table
CREATE TABLE IF NOT EXISTS project_status_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_site_id INT NOT NULL,
    old_status ENUM('Pending', 'In Progress', 'Done', 'Cancelled', 'On Hold'),
    new_status ENUM('Pending', 'In Progress', 'Done', 'Cancelled', 'On Hold') NOT NULL,
    reason TEXT,
    changed_by INT,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_site_id) REFERENCES project_sites(id) ON DELETE CASCADE,
    INDEX idx_project (project_site_id),
    INDEX idx_changed_at (changed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    table_name VARCHAR(50) NOT NULL,
    record_id INT NOT NULL,
    action ENUM('CREATE', 'UPDATE', 'DELETE', 'IMPORT', 'EXPORT') NOT NULL,
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(45),
    user_agent VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_table_record (table_name, record_id),
    INDEX idx_user (user_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- STEP 5: CSV IMPORT TRACKING TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS csv_imports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255),
    total_rows INT DEFAULT 0,
    success_count INT DEFAULT 0,
    error_count INT DEFAULT 0,
    errors JSON,
    imported_by INT,
    status ENUM('Pending', 'Processing', 'Completed', 'Failed', 'Partial') DEFAULT 'Pending',
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (imported_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_status (status),
    INDEX idx_imported_by (imported_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- STEP 6: CREATE VIEWS
-- =============================================================================

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
-- STEP 7: CREATE TRIGGERS
-- =============================================================================

DELIMITER //

CREATE TRIGGER trg_project_sites_insert
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

CREATE TRIGGER trg_project_sites_update
AFTER UPDATE ON project_sites
FOR EACH ROW
BEGIN
    IF OLD.status != NEW.status THEN
        INSERT INTO project_status_history (project_site_id, old_status, new_status, changed_by, changed_at)
        VALUES (NEW.id, OLD.status, NEW.status, @current_user_id, NOW());
    END IF;
    
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

CREATE TRIGGER trg_project_sites_delete
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

DELIMITER ;

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================
-- Tables created:
--   - provinces
--   - districts
--   - municipalities
--   - barangays
--   - project_types
--   - project_sites
--   - project_status_history
--   - users
--   - audit_logs
--   - csv_imports
-- Views created:
--   - project_summary_view
-- Triggers created:
--   - trg_project_sites_insert
--   - trg_project_sites_update
--   - trg_project_sites_delete
-- =============================================================================

-- =============================================================================
-- DOWN MIGRATION (for rollback)
-- =============================================================================
-- Uncomment the following to rollback this migration:
/*
DROP TRIGGER IF EXISTS trg_project_sites_delete;
DROP TRIGGER IF EXISTS trg_project_sites_update;
DROP TRIGGER IF EXISTS trg_project_sites_insert;
DROP VIEW IF EXISTS project_summary_view;
DROP TABLE IF EXISTS csv_imports;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS project_status_history;
DROP TABLE IF EXISTS project_sites;
DROP TABLE IF EXISTS project_types;
DROP TABLE IF EXISTS barangays;
DROP TABLE IF EXISTS municipalities;
DROP TABLE IF EXISTS districts;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS provinces;
*/
