-- ==============================================================================
-- Clinic Management System (CMS) — Full Supabase Database Schema
-- Run this script in the Supabase Dashboard: SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. Accounts (User credentials, roles, authentication states)
CREATE TABLE IF NOT EXISTS public.accounts (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Staff (Physicians, receptionists, access credentials, permissions)
CREATE TABLE IF NOT EXISTS public.staff (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Patients (Demographics, medical history, emergency contacts, MRN)
CREATE TABLE IF NOT EXISTS public.patients (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Patient Assignments (Doctor-patient assignments)
CREATE TABLE IF NOT EXISTS public.patient_assignments (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Appointments (Scheduled visits, time buckets, tokens, statuses)
CREATE TABLE IF NOT EXISTS public.appointments (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Visits (Clinical encounters, soap notes, diagnoses)
CREATE TABLE IF NOT EXISTS public.visits (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Prescriptions (Electronic prescriptions, medications, dosages)
CREATE TABLE IF NOT EXISTS public.prescriptions (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Invoices (Billing entries, itemized line items, totals, balances)
CREATE TABLE IF NOT EXISTS public.invoices (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Payments (Settlement records, receipts, cash/card/UPI transactions)
CREATE TABLE IF NOT EXISTS public.payments (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Attendance (Clock-in/out records, working hours, shifts)
CREATE TABLE IF NOT EXISTS public.attendance (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Leave Requests (Staff leave applications, approvals, balances)
CREATE TABLE IF NOT EXISTS public.leave_requests (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Shifts (Rosters, department scheduling)
CREATE TABLE IF NOT EXISTS public.shifts (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Roles (Access modules, clearance permissions)
CREATE TABLE IF NOT EXISTS public.roles (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Approvals (Pending staff approval requests)
CREATE TABLE IF NOT EXISTS public.approvals (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. Claim Requests (Patient account linkage claims)
CREATE TABLE IF NOT EXISTS public.claim_requests (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. Security Ledger (Immutable audit logs, security events)
CREATE TABLE IF NOT EXISTS public.ledger (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. Notifications (In-app user directives, messages)
CREATE TABLE IF NOT EXISTS public.notifications (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 18. Formulary (Clinic medicine catalog, dosage units, stock)
CREATE TABLE IF NOT EXISTS public.formulary (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- Row Level Security (RLS) and Access Policies
-- Allows the web client to read and write records with standard anon/authenticated API keys
-- ==============================================================================

DO $$
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'accounts', 'staff', 'patients', 'patient_assignments', 'appointments',
        'visits', 'prescriptions', 'invoices', 'payments', 'attendance',
        'leave_requests', 'shifts', 'roles', 'approvals', 'claim_requests',
        'ledger', 'notifications', 'formulary'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        -- Enable RLS
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
        
        -- Select Policy
        EXECUTE format('DROP POLICY IF EXISTS "Public select on %1$I" ON public.%1$I;', tbl);
        EXECUTE format('CREATE POLICY "Public select on %1$I" ON public.%1$I FOR SELECT USING (true);', tbl);
        
        -- Insert Policy
        EXECUTE format('DROP POLICY IF EXISTS "Public insert on %1$I" ON public.%1$I;', tbl);
        EXECUTE format('CREATE POLICY "Public insert on %1$I" ON public.%1$I FOR INSERT WITH CHECK (true);', tbl);
        
        -- Update Policy
        EXECUTE format('DROP POLICY IF EXISTS "Public update on %1$I" ON public.%1$I;', tbl);
        EXECUTE format('CREATE POLICY "Public update on %1$I" ON public.%1$I FOR UPDATE USING (true) WITH CHECK (true);', tbl);
        
        -- Delete Policy
        EXECUTE format('DROP POLICY IF EXISTS "Public delete on %1$I" ON public.%1$I;', tbl);
        EXECUTE format('CREATE POLICY "Public delete on %1$I" ON public.%1$I FOR DELETE USING (true);', tbl);
        
        -- GIN Index on JSONB data
        EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I USING GIN (data);', 'idx_' || tbl || '_gin', tbl);
        
        -- B-Tree Index on created_at
        EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (created_at DESC);', 'idx_' || tbl || '_created_at', tbl);
    END LOOP;
END $$;
