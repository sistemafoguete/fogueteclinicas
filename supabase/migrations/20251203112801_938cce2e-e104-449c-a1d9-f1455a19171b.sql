-- Adicionar novos cargos profissionais ao enum employee_role
ALTER TYPE employee_role ADD VALUE IF NOT EXISTS 'terapeuta_ocupacional_integracao';
ALTER TYPE employee_role ADD VALUE IF NOT EXISTS 'psiquiatra';
ALTER TYPE employee_role ADD VALUE IF NOT EXISTS 'neuropediatra';