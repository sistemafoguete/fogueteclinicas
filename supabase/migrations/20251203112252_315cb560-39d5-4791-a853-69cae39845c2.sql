-- Adicionar novo cargo de Coordenador Atendimento Floresta ao enum employee_role
ALTER TYPE employee_role ADD VALUE IF NOT EXISTS 'coordinator_atendimento_floresta';