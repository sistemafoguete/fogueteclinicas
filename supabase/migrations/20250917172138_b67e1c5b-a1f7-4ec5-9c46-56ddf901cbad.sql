-- Teste do sistema automático de relatórios - com schedule_id válido
INSERT INTO attendance_reports (
  schedule_id,
  employee_id,
  client_id,
  start_time,
  end_time,
  attendance_type,
  session_duration,
  techniques_used,
  patient_response,
  session_notes,
  observations,
  next_session_plan,
  materials_used,
  amount_charged,
  status,
  professional_name,
  patient_name,
  created_by
) VALUES (
  'ba676081-ec18-406c-82a1-83932fbbd2e7', -- Schedule já existente com status completed
  'f4c5d5c9-304d-4e39-a982-279a8a7e2a8f', -- Dev (director)
  'ea58f756-6b6d-431e-852d-efbfdcfbe240', -- Ana Carolina Lima
  NOW() - INTERVAL '1 hour',
  NOW(),
  'Psicologia',
  60,
  'Terapia cognitivo-comportamental, técnicas de relaxamento',
  'Paciente demonstrou boa receptividade às técnicas apresentadas',
  'Sessão focada em técnicas de manejo de ansiedade',
  'Paciente relatou melhora significativa desde a última sessão',
  'Próxima sessão: aprofundar técnicas de mindfulness',
  '[{"name": "Material didático", "quantity": 1, "cost": 15.00}]'::jsonb,
  80.00,
  'completed', -- STATUS COMPLETED para triggerar o relatório automático
  'Dev',
  'Ana Carolina Lima',
  'f4c5d5c9-304d-4e39-a982-279a8a7e2a8f'
);