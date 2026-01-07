-- Tornar schedule_id opcional para permitir relatórios independentes
ALTER TABLE attendance_reports 
ALTER COLUMN schedule_id DROP NOT NULL;