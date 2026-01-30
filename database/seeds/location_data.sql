-- =============================================================================
-- Location Data Seed File
-- Region 02 (Cagayan Valley) - Batanes and Cagayan Provinces
-- =============================================================================
-- This seed file populates the location hierarchy for the project tracking
-- system with sample data from Batanes and Cagayan provinces.
--
-- Location Hierarchy:
--   Province: Batanes
--     District: District I
--       Municipality: Itbayat
--         Barangays: Raele, Santa Lucia, Santa Maria
--       Municipality: Ivana
--         Barangay: Salagao
--   Province: Cagayan
--     District: District III
--       Municipality: Iguig
--         Barangay: Ajat
-- =============================================================================

-- Use the project_tracking database
-- USE project_tracking;

-- =============================================================================
-- PROVINCES
-- =============================================================================

INSERT INTO provinces (name, region_code, centroid, created_at, updated_at) VALUES
('Batanes', '02', ST_GeomFromText('POINT(121.875 20.75)', 4326), NOW(), NOW()),
('Cagayan', '02', ST_GeomFromText('POINT(121.75 17.75)', 4326), NOW(), NOW());

-- Note: Provinces are inserted with IDs 1 (Batanes) and 2 (Cagayan)

-- =============================================================================
-- DISTRICTS
-- =============================================================================

INSERT INTO districts (province_id, name, district_code, created_at) VALUES
-- Batanes Districts
(1, 'District I', 'BTN-D1', NOW()),
(2, 'District III', 'CAG-D3', NOW());

-- Note: Districts are inserted with IDs 1 (District I, Batanes) and 2 (District III, Cagayan)

-- =============================================================================
-- MUNICIPALITIES
-- =============================================================================

INSERT INTO municipalities (province_id, district_id, name, municipality_code, centroid, created_at) VALUES
-- Batanes Municipalities
(1, 1, 'Itbayat', 'BTN-ITB', ST_GeomFromText('POINT(121.833 20.783)', 4326), NOW()),
(1, 1, 'Ivana', 'BTN-IVN', ST_GeomFromText('POINT(121.917 20.367)', 4326), NOW()),
-- Cagayan Municipalities
(2, 2, 'Iguig', 'CAG-IGG', ST_GeomFromText('POINT(121.733 17.75)', 4326), NOW());

-- Note: Municipalities are inserted with IDs 1 (Itbayat), 2 (Ivana), 3 (Iguig)

-- =============================================================================
-- BARANGAYS
-- =============================================================================

INSERT INTO barangays (municipality_id, name, barangay_code, centroid, created_at) VALUES
-- Itbayat Barangays (Municipality ID: 1)
(1, 'Raele', 'BTN-ITB-RLE', ST_GeomFromText('POINT(121.804235 20.728794)', 4326), NOW()),
(1, 'Santa Lucia', 'BTN-ITB-SLU', ST_GeomFromText('POINT(121.840664 20.784595)', 4326), NOW()),
(1, 'Santa Maria', 'BTN-ITB-SMA', ST_GeomFromText('POINT(121.842022 20.785447)', 4326), NOW()),
-- Ivana Barangays (Municipality ID: 2)
(2, 'Salagao', 'BTN-IVN-SLG', ST_GeomFromText('POINT(121.915566 20.373518)', 4326), NOW()),
-- Iguig Barangays (Municipality ID: 3)
(3, 'Ajat', 'CAG-IGG-AJT', ST_GeomFromText('POINT(121.735036 17.749298)', 4326), NOW());

-- =============================================================================
-- SEED COMPLETE
-- =============================================================================
-- Summary:
--   Provinces: 2 (Batanes, Cagayan)
--   Districts: 2 (District I - Batanes, District III - Cagayan)
--   Municipalities: 3 (Itbayat, Ivana, Iguig)
--   Barangays: 5 (Raele, Santa Lucia, Santa Maria, Salagao, Ajat)
--
-- Location IDs Reference:
--   Province IDs: 1 = Batanes, 2 = Cagayan
--   District IDs: 1 = District I (Batanes), 2 = District III (Cagayan)
--   Municipality IDs: 1 = Itbayat, 2 = Ivana, 3 = Iguig
--   Barangay IDs: 1 = Raele, 2 = Santa Lucia, 3 = Santa Maria, 4 = Salagao, 5 = Ajat
-- =============================================================================
