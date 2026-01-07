-- Inserir dados de exemplo para meeting_alerts com estrutura correta
INSERT INTO public.meeting_alerts (
  title,
  message,
  meeting_date,
  meeting_location,
  meeting_room,
  participants,
  status,
  created_by
) VALUES
  -- Reunião agendada para hoje às 14:00
  (
    'Reunião de Planejamento Semanal',
    'Discussão sobre metas e objetivos da semana. Trazer relatórios de atividades.',
    CURRENT_DATE + INTERVAL '14 hours',
    'Unidade Madre',
    'Sala de Reuniões',
    ARRAY[]::uuid[],
    'scheduled',
    (SELECT user_id FROM profiles WHERE employee_role = 'director' LIMIT 1)
  ),
  -- Reunião agendada para amanhã às 10:00
  (
    'Alinhamento com Equipe Clínica',
    'Revisão de casos e condutas terapêuticas. Preparar apresentação de casos.',
    CURRENT_DATE + INTERVAL '1 day' + INTERVAL '10 hours',
    'Unidade Floresta',
    'Sala de Coordenação',
    ARRAY[]::uuid[],
    'scheduled',
    (SELECT user_id FROM profiles WHERE employee_role = 'coordinator_floresta' LIMIT 1)
  ),
  -- Reunião futura (5 dias) às 09:00
  (
    'Treinamento de Novos Protocolos',
    'Capacitação sobre novos procedimentos de atendimento. Participação obrigatória para toda equipe.',
    CURRENT_DATE + INTERVAL '5 days' + INTERVAL '9 hours',
    'Unidade Madre',
    'Auditório Principal',
    ARRAY[]::uuid[],
    'scheduled',
    (SELECT user_id FROM profiles WHERE employee_role = 'director' LIMIT 1)
  ),
  -- Reunião completada (5 dias atrás) às 15:00
  (
    'Reunião de Fechamento Mensal',
    'Análise de resultados e indicadores do mês anterior. Reunião concluída com sucesso, atas enviadas por email.',
    CURRENT_DATE - INTERVAL '5 days' + INTERVAL '15 hours',
    'Unidade Madre',
    'Sala de Reuniões',
    ARRAY[]::uuid[],
    'completed',
    (SELECT user_id FROM profiles WHERE employee_role = 'director' LIMIT 1)
  ),
  -- Reunião cancelada (3 dias) às 13:30
  (
    'Workshop de Desenvolvimento',
    'Sessão de capacitação em novas técnicas. Cancelada devido a conflito de agenda, será reagendada.',
    CURRENT_DATE + INTERVAL '3 days' + INTERVAL '13 hours 30 minutes',
    'Unidade Floresta',
    'Sala de Treinamento',
    ARRAY[]::uuid[],
    'cancelled',
    (SELECT user_id FROM profiles WHERE employee_role = 'coordinator_madre' LIMIT 1)
  ),
  -- Reunião próxima semana às 11:00
  (
    'Avaliação de Qualidade',
    'Revisão dos processos de qualidade e feedback dos clientes. Trazer relatórios de satisfação.',
    CURRENT_DATE + INTERVAL '7 days' + INTERVAL '11 hours',
    'Unidade Madre',
    'Sala de Coordenação',
    ARRAY[]::uuid[],
    'scheduled',
    (SELECT user_id FROM profiles WHERE employee_role = 'coordinator_madre' LIMIT 1)
  );