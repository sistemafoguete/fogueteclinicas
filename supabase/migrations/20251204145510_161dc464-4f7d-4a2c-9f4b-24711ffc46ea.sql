-- Adicionar campos de neuroavaliação na tabela clients
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS gender text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS neuro_test_start_date date;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS neuro_report_deadline date;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS neuro_report_file_path text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS neuro_diagnosis_suggestion text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS neuro_tests_applied jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS neuro_socioeconomic text;

-- Comentários explicativos para os novos campos
COMMENT ON COLUMN public.clients.gender IS 'Gênero do paciente (masculino, feminino, outro)';
COMMENT ON COLUMN public.clients.neuro_test_start_date IS 'Data de início dos testes neuropsicológicos';
COMMENT ON COLUMN public.clients.neuro_report_deadline IS 'Prazo para entrega do laudo';
COMMENT ON COLUMN public.clients.neuro_report_file_path IS 'Caminho do arquivo do laudo final';
COMMENT ON COLUMN public.clients.neuro_diagnosis_suggestion IS 'Sugestão de diagnóstico do encaminhamento médico (TEA, TDAH, TOD, etc)';
COMMENT ON COLUMN public.clients.neuro_tests_applied IS 'Array JSON com os testes aplicados';
COMMENT ON COLUMN public.clients.neuro_socioeconomic IS 'Nível socioeconômico (A, B, C, D, E)';