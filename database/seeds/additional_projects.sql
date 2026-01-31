-- =============================================================================
-- Additional Sample Projects with Philippines Coordinates
-- =============================================================================
-- This file adds more sample projects to the project_sites table with valid
-- coordinates within Philippines bounds (Lat: 4°N-21°N, Long: 116°E-127°E)
-- =============================================================================

-- Additional projects using existing barangays but with different coordinates
-- and various statuses to test map markers

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
-- BATANES PROJECTS - Various Types and Statuses
-- ============================================================================

-- Raele Barangay - Free-WIFI Projects (Project Type: 1)
(
    'UNDP-BAT-RLE-001',
    1,
    'Raele Community Center WiFi',
    1,  -- Raele barangay
    1,  -- Itbayat municipality
    1,  -- Batanes province
    1,  -- District I
    20.731500,
    121.808000,
    ST_GeomFromText('POINT(121.808000 20.731500)', 4326),
    '2024-06-15',
    'In Progress',
    'Community center WiFi installation ongoing',
    NOW(),
    NOW()
),
(
    'UNDP-BAT-RLE-002',
    1,
    'Raele Elementary School WiFi',
    1,  -- Raele barangay
    1,  -- Itbayat municipality
    1,  -- Batanes province
    1,  -- District I
    20.726000,
    121.801500,
    ST_GeomFromText('POINT(121.801500 20.726000)', 4326),
    '2024-07-01',
    'Pending',
    'Pending school board approval',
    NOW(),
    NOW()
),

-- Santa Lucia Barangay - PNPKI/CYBER Projects (Project Type: 2)
(
    'CYBER-BAT-SLU-001',
    2,
    'Santa Lucia Health Center Digital Security',
    2,  -- Santa Lucia barangay
    1,  -- Itbayat municipality
    1,  -- Batanes province
    1,  -- District I
    20.788000,
    121.843500,
    ST_GeomFromText('POINT(121.843500 20.788000)', 4326),
    '2024-08-10',
    'Done',
    'Digital security infrastructure installed',
    NOW(),
    NOW()
),
(
    'CYBER-BAT-SLU-002',
    2,
    'Santa Lucia Barangay Hall Cyber Hub',
    2,  -- Santa Lucia barangay
    1,  -- Itbayat municipality
    1,  -- Batanes province
    1,  -- District I
    20.790500,
    121.846000,
    ST_GeomFromText('POINT(121.846000 20.790500)', 4326),
    '2024-09-01',
    'In Progress',
    'Cyber hub setup in progress',
    NOW(),
    NOW()
),

-- Santa Maria Barangay - IIDB Projects (Project Type: 3)
(
    'IIDB-BAT-SMA-001',
    3,
    'Santa Maria High School ICT Lab',
    3,  -- Santa Maria barangay
    1,  -- Itbayat municipality
    1,  -- Batanes province
    1,  -- District I
    20.788500,
    121.845000,
    ST_GeomFromText('POINT(121.845000 20.788500)', 4326),
    '2024-10-15',
    'Pending',
    'Waiting for equipment delivery',
    NOW(),
    NOW()
),

-- Ivana, Salagao Barangay - DigiGov-eLGU Projects (Project Type: 4)
(
    'eLGU-BTN-SLG-001',
    4,
    'Salagao Municipal Office eLGU System',
    4,  -- Salagao barangay
    2,  -- Ivana municipality
    1,  -- Batanes province
    1,  -- District I
    20.376000,
    121.918000,
    ST_GeomFromText('POINT(121.918000 20.376000)', 4326),
    '2024-11-01',
    'Done',
    'eLGU system fully operational',
    NOW(),
    NOW()
),
(
    'eLGU-BTN-SLG-002',
    4,
    'Salagao Public Market Digital Kiosk',
    4,  -- Salagao barangay
    2,  -- Ivana municipality
    1,  -- Batanes province
    1,  -- District I
    20.371000,
    121.912000,
    ST_GeomFromText('POINT(121.912000 20.371000)', 4326),
    '2024-12-01',
    'In Progress',
    'Kiosk installation ongoing',
    NOW(),
    NOW()
),

-- ============================================================================
-- CAGAYAN PROJECTS - Various Types and Statuses
-- ============================================================================

-- Iguig, Ajat Barangay - Free-WIFI Projects (Project Type: 1)
(
    'UNDP-CAG-AJT-001',
    1,
    'Ajat Community Plaza WiFi',
    5,  -- Ajat barangay
    3,  -- Iguig municipality
    2,  -- Cagayan province
    2,  -- District III
    17.752000,
    121.738000,
    ST_GeomFromText('POINT(121.738000 17.752000)', 4326),
    '2025-01-15',
    'Pending',
    'Awaiting budget approval',
    NOW(),
    NOW()
),

-- Iguig, Ajat Barangay - PNPKI/CYBER Projects (Project Type: 2)
(
    'CYBER-CAG-AJT-001',
    2,
    'Ajat Barangay Hall Cyber Security',
    5,  -- Ajat barangay
    3,  -- Iguig municipality
    2,  -- Cagayan province
    2,  -- District III
    17.745000,
    121.732000,
    ST_GeomFromText('POINT(121.732000 17.745000)', 4326),
    '2025-02-01',
    'In Progress',
    'Security audit in progress',
    NOW(),
    NOW()
),

-- Iguig, Ajat Barangay - IIDB Projects (Project Type: 3)
(
    'IIDB-CAG-AJT-001',
    3,
    'Ajat Elementary School Computer Lab',
    5,  -- Ajat barangay
    3,  -- Iguig municipality
    2,  -- Cagayan province
    2,  -- District III
    17.748500,
    121.739500,
    ST_GeomFromText('POINT(121.739500 17.748500)', 4326),
    '2025-02-15',
    'Done',
    'Computer lab fully equipped',
    NOW(),
    NOW()
);

-- =============================================================================
-- ADDITIONAL PROJECTS SEED COMPLETE
-- =============================================================================
-- Summary:
--   Total New Projects: 10
--
-- Breakdown by Province:
--   Batanes: 7 projects
--   Cagayan: 3 projects
--
-- Breakdown by Status:
--   Pending: 3 projects
--   In Progress: 3 projects
--   Done: 4 projects
--
-- All coordinates are within Philippines bounds:
--   Latitude: 4°N to 21°N ✓
--   Longitude: 116°E to 127°E ✓
-- =============================================================================
