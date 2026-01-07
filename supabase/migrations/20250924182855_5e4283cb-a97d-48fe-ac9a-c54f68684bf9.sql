-- Delete all clients and related data
-- First, delete all related records to avoid foreign key constraints

-- Delete attendance reports
DELETE FROM public.attendance_reports;

-- Delete medical records  
DELETE FROM public.medical_records;

-- Delete client assignments
DELETE FROM public.client_assignments;

-- Delete client documents
DELETE FROM public.client_documents;

-- Delete client notes
DELETE FROM public.client_notes;

-- Delete schedules
DELETE FROM public.schedules;

-- Delete appointment sessions
DELETE FROM public.appointment_sessions;

-- Delete automatic financial records related to clients
DELETE FROM public.automatic_financial_records;

-- Finally, delete all clients
DELETE FROM public.clients;