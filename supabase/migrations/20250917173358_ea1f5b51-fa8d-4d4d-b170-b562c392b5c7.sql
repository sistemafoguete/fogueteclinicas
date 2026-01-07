-- Criar função para validar agendamentos baseados no papel do usuário
CREATE OR REPLACE FUNCTION public.validate_schedule_permissions()
RETURNS TRIGGER AS $$
DECLARE
  user_role employee_role;
  is_admin boolean := false;
BEGIN
  -- Buscar o papel do usuário atual
  SELECT employee_role INTO user_role
  FROM public.profiles 
  WHERE user_id = auth.uid();
  
  -- Verificar se é administrativo (pode agendar para qualquer um)
  is_admin := user_role IN ('director', 'coordinator_madre', 'coordinator_floresta', 'receptionist');
  
  -- Se não for administrativo, só pode agendar para si mesmo
  IF NOT is_admin AND NEW.employee_id != auth.uid() THEN
    RAISE EXCEPTION 'Profissionais só podem agendar atendimentos para si mesmos. Seu papel: %', user_role;
  END IF;
  
  -- Se não for administrativo, só pode agendar para clientes vinculados
  IF NOT is_admin THEN
    -- Verificar se o cliente está vinculado ao profissional
    IF NOT EXISTS (
      SELECT 1 FROM public.client_assignments 
      WHERE client_id = NEW.client_id 
      AND employee_id = auth.uid() 
      AND is_active = true
    ) THEN
      RAISE EXCEPTION 'Você só pode agendar para clientes vinculados ao seu atendimento';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar trigger para validar agendamentos antes da inserção
CREATE TRIGGER validate_schedule_permissions_trigger
  BEFORE INSERT OR UPDATE ON public.schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_schedule_permissions();

-- Comentário explicativo
COMMENT ON FUNCTION public.validate_schedule_permissions() IS 
'Valida que profissionais comuns só podem agendar para si mesmos e para clientes vinculados. Administradores (diretor, coordenadores, recepcionista) podem agendar para qualquer profissional e cliente.';