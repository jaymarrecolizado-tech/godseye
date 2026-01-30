-- =============================================================================
-- Sample Projects Seed File
-- =============================================================================
-- This seed file populates the project_sites table with sample project data
-- from the database.xlsx spreadsheet. Includes 10 projects with site codes,
-- coordinates, and statuses from Batanes and Cagayan provinces.
--
-- Note: This seed depends on location_data.sql and project_types.sql
--       being executed first to establish proper foreign key references.
-- =============================================================================

-- Use the project_tracking database
-- USE project_tracking;

-- =============================================================================
-- SAMPLE PROJECT SITES
-- =============================================================================

INSERT INTO project_sites (
    site_code,
    project_type_id,
    site_name,
    barangay_id,
    municipality_id,
    province_id,
    district_id,
    latitude,
    longitude,
    location,
    activation_date,
    status,
    remarks,
    created_at,
    updated_at
) VALUES
-- ============================================================================
-- Batanes Projects - Free-WIFI for All (UNDP)
-- ============================================================================

-- Raele Barangay Hall Access Points (Project Type: Free-WIFI for All - ID: 1)
(
    'UNDP-GI-0009A',
    1,
    'Raele Barangay Hall - AP 1',
    1,  -- Raele barangay
    1,  -- Itbayat municipality
    1,  -- Batanes province
    1,  -- District I
    20.728794,
    121.804235,
    ST_GeomFromText('POINT(121.804235 20.728794)', 4326),
    '2024-04-29',
    'Done',
    'First access point installed at Raele Barangay Hall',
    NOW(),
    NOW()
),
(
    'UNDP-GI-0009B',
    1,
    'Raele Barangay Hall - AP 2',
    1,  -- Raele barangay
    1,  -- Itbayat municipality
    1,  -- Batanes province
    1,  -- District I
    20.728794,
    121.804235,
    ST_GeomFromText('POINT(121.804235 20.728794)', 4326),
    '2024-04-29',
    'Done',
    'Second access point installed at Raele Barangay Hall',
    NOW(),
    NOW()
),

-- Salagao Barangay Hall Access Points (Project Type: Free-WIFI for All - ID: 1)
(
    'UNDP-GI-0010A',
    1,
    'Salagao Barangay Hall - AP 1',
    4,  -- Salagao barangay
    2,  -- Ivana municipality
    1,  -- Batanes province
    1,  -- District I
    20.373518,
    121.915566,
    ST_GeomFromText('POINT(121.915566 20.373518)', 4326),
    '2024-05-07',
    'Done',
    'First access point at Salagao Barangay Hall, Ivana',
    NOW(),
    NOW()
),
(
    'UNDP-GI-0010B',
    1,
    'Salagao Barangay Hall - AP 2',
    4,  -- Salagao barangay
    2,  -- Ivana municipality
    1,  -- Batanes province
    1,  -- District I
    20.373518,
    121.915566,
    ST_GeomFromText('POINT(121.915566 20.373518)', 4326),
    '2024-05-07',
    'Done',
    'Second access point at Salagao Barangay Hall, Ivana',
    NOW(),
    NOW()
),

-- Santa Lucia Barangay Hall Access Points (Project Type: Free-WIFI for All - ID: 1)
(
    'UNDP-IP-0031A',
    1,
    'Santa Lucia Barangay Hall - AP 1',
    2,  -- Santa Lucia barangay
    1,  -- Itbayat municipality
    1,  -- Batanes province
    1,  -- District I
    20.784595,
    121.840664,
    ST_GeomFromText('POINT(121.840664 20.784595)', 4326),
    '2024-04-30',
    'Done',
    'First access point at Santa Lucia Barangay Hall',
    NOW(),
    NOW()
),
(
    'UNDP-IP-0031B',
    1,
    'Santa Lucia Barangay Hall - AP 2',
    2,  -- Santa Lucia barangay
    1,  -- Itbayat municipality
    1,  -- Batanes province
    1,  -- District I
    20.784595,
    121.840664,
    ST_GeomFromText('POINT(121.840664 20.784595)', 4326),
    '2024-04-30',
    'Done',
    'Second access point at Santa Lucia Barangay Hall',
    NOW(),
    NOW()
),

-- Santa Maria Barangay Hall Access Point (Project Type: Free-WIFI for All - ID: 1)
(
    'UNDP-IP-0032A',
    1,
    'Santa Maria Barangay Hall - AP 1',
    3,  -- Santa Maria barangay
    1,  -- Itbayat municipality
    1,  -- Batanes province
    1,  -- District I
    20.785447,
    121.842022,
    ST_GeomFromText('POINT(121.842022 20.785447)', 4326),
    '2024-04-29',
    'Done',
    'Access point at Santa Maria Barangay Hall',
    NOW(),
    NOW()
),

-- ============================================================================
-- Cagayan Projects - Multiple Project Types
-- ============================================================================

-- Iguig National High School - PNPKI/CYBER (Project Type: PNPKI/CYBER - ID: 2)
(
    'CYBER-1231231',
    2,
    'Iguig National High School',
    5,  -- Ajat barangay
    3,  -- Iguig municipality
    2,  -- Cagayan province
    2,  -- District III
    17.749298,
    121.735036,
    ST_GeomFromText('POINT(121.735036 17.749298)', 4326),
    '2025-03-19',
    'Done',
    'PNPKI/Cyber infrastructure installed at Iguig National High School',
    NOW(),
    NOW()
),

-- Iguig National High School - IIDB (Project Type: IIDB - ID: 3)
(
    'IIDB-1231231',
    3,
    'Iguig National High School',
    5,  -- Ajat barangay
    3,  -- Iguig municipality
    2,  -- Cagayan province
    2,  -- District III
    17.749298,
    121.735036,
    ST_GeomFromText('POINT(121.735036 17.749298)', 4326),
    '2025-03-19',
    'Done',
    'ICT infrastructure development at Iguig National High School',
    NOW(),
    NOW()
),

-- Iguig National High School - DigiGov-eLGU (Project Type: DigiGov-eLGU - ID: 4)
(
    'eLGU-1231231',
    4,
    'Iguig National High School',
    5,  -- Ajat barangay
    3,  -- Iguig municipality
    2,  -- Cagayan province
    2,  -- District III
    17.749298,
    121.735036,
    ST_GeomFromText('POINT(121.735036 17.749298)', 4326),
    '2026-03-19',
    'Pending',
    'eLGU program implementation at Iguig National High School - scheduled activation',
    NOW(),
    NOW()
);

-- =============================================================================
-- SEED COMPLETE
-- =============================================================================
-- Summary:
--   Total Projects: 10
--
-- Breakdown by Province:
--   Batanes: 7 projects (all UNDP/Free-WIFI)
--   Cagayan: 3 projects (CYBER, IIDB, eLGU)
--
-- Breakdown by Project Type:
--   Free-WIFI for All (UNDP): 7 projects
--   PNPKI/CYBER: 1 project
--   IIDB: 1 project
--   DigiGov-eLGU: 1 project
--
-- Breakdown by Status:
--   Done: 9 projects
--   Pending: 1 project (eLGU-1231231)
--
-- Geographic Distribution:
--   Itbayat, Batanes: 5 projects (Raele, Santa Lucia, Santa Maria barangays)
--   Ivana, Batanes: 2 projects (Salagao barangay)
--   Iguig, Cagayan: 3 projects (Ajat barangay)
-- =============================================================================
