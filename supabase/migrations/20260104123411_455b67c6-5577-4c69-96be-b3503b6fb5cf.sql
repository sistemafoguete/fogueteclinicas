-- Corrigir registros de feedback que têm deadline incorreto (mesmo dia da criação)
-- Recalcula usando 15 dias úteis a partir da data de início

UPDATE client_feedback_control 
SET deadline_date = (
  SELECT check_date FROM (
    WITH RECURSIVE business_days AS (
      SELECT 
        (client_feedback_control.started_at::DATE + 1) AS check_date,
        CASE 
          WHEN EXTRACT(DOW FROM client_feedback_control.started_at::DATE + 1) NOT IN (0, 6) THEN 1 
          ELSE 0 
        END AS days_counted
      UNION ALL
      SELECT 
        check_date + 1,
        days_counted + CASE 
          WHEN EXTRACT(DOW FROM check_date + 1) NOT IN (0, 6) THEN 1 
          ELSE 0 
        END
      FROM business_days
      WHERE days_counted < 15
    )
    SELECT check_date FROM business_days WHERE days_counted = 15 LIMIT 1
  ) calc
)
WHERE deadline_date::DATE = started_at::DATE;