-- =============================================================================
-- Project Types Seed File
-- =============================================================================
-- This seed file populates the project types table with the standard
-- project categories for the Philippine government digital infrastructure
-- initiatives.
--
-- Project Types:
--   1. Free-WIFI for All - UNDP prefix, green color (#28a745)
--   2. PNPKI/CYBER - CYBER prefix, red color (#dc3545)
--   3. IIDB - IIDB prefix, blue color (#007bff)
--   4. DigiGov-eLGU - eLGU prefix, yellow color (#ffc107)
-- =============================================================================

-- Use the project_tracking database
-- USE project_tracking;

-- =============================================================================
-- PROJECT TYPES
-- =============================================================================

INSERT INTO project_types (name, code_prefix, description, color_code, is_active, created_at, updated_at) VALUES
(
    'Free-WIFI for All',
    'UNDP',
    'Universal Access to Free Wi-Fi Program - Provides free internet access in public places across the Philippines including government offices, public schools, parks, plazas, libraries, and health centers. This initiative aims to bridge the digital divide and promote digital inclusion.',
    '#28a745',
    TRUE,
    NOW(),
    NOW()
),
(
    'PNPKI/CYBER',
    'CYBER',
    'Philippine National Public Key Infrastructure and Cybersecurity Program - Ensures secure digital transactions through digital signatures and certificates. Includes cybersecurity initiatives to protect government digital infrastructure.',
    '#dc3545',
    TRUE,
    NOW(),
    NOW()
),
(
    'IIDB',
    'IIDB',
    'ICT Infrastructure Development Program - Focuses on building and enhancing ICT infrastructure across government agencies to support digital transformation initiatives and improve service delivery to citizens.',
    '#007bff',
    TRUE,
    NOW(),
    NOW()
),
(
    'DigiGov-eLGU',
    'eLGU',
    'Digital Government and e-Local Government Unit Program - Enables local government units to digitize their operations and services, facilitating better governance and citizen engagement at the local level.',
    '#ffc107',
    TRUE,
    NOW(),
    NOW()
);

-- =============================================================================
-- SEED COMPLETE
-- =============================================================================
-- Summary:
--   Project Types: 4
--
-- Project Type IDs Reference:
--   1 = Free-WIFI for All (UNDP)
--   2 = PNPKI/CYBER (CYBER)
--   3 = IIDB (IIDB)
--   4 = DigiGov-eLGU (eLGU)
--
-- Color Codes:
--   Free-WIFI for All: #28a745 (Green - represents connectivity/growth)
--   PNPKI/CYBER: #dc3545 (Red - represents security/alert)
--   IIDB: #007bff (Blue - represents technology/infrastructure)
--   DigiGov-eLGU: #ffc107 (Yellow - represents government/caution)
-- =============================================================================
