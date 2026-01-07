-- Create the function to get stock movements with details
CREATE OR REPLACE FUNCTION public.get_stock_movements_with_details()
RETURNS TABLE(
  id UUID,
  stock_item_id UUID,
  item_name TEXT,
  moved_by UUID,
  moved_by_name TEXT,
  movement_type TEXT,
  quantity INTEGER,
  previous_quantity INTEGER,
  new_quantity INTEGER,
  unit_cost NUMERIC,
  total_cost NUMERIC,
  reason TEXT,
  notes TEXT,
  attendance_id UUID,
  client_id UUID,
  client_name TEXT,
  schedule_id UUID,
  from_location TEXT,
  to_location TEXT,
  date DATE,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    sm.id,
    sm.stock_item_id,
    si.name as item_name,
    COALESCE(sm.moved_by, sm.created_by) as moved_by,
    p.name as moved_by_name,
    sm.type as movement_type,
    sm.quantity,
    sm.previous_quantity,
    sm.new_quantity,
    sm.unit_cost,
    sm.total_cost,
    sm.reason,
    sm.notes,
    sm.attendance_id,
    sm.client_id,
    c.name as client_name,
    sm.schedule_id,
    sm.from_location,
    sm.to_location,
    sm.date,
    sm.created_at
  FROM public.stock_movements sm
  LEFT JOIN public.stock_items si ON sm.stock_item_id = si.id
  LEFT JOIN public.profiles p ON COALESCE(sm.moved_by, sm.created_by) = p.user_id
  LEFT JOIN public.clients c ON sm.client_id = c.id
  WHERE (
    -- Access control: directors, stock managers, or own movements
    user_has_role(ARRAY['director'::employee_role]) OR
    user_has_role(ARRAY['financeiro'::employee_role, 'coordinator_madre'::employee_role, 'coordinator_floresta'::employee_role]) OR
    COALESCE(sm.moved_by, sm.created_by) = auth.uid()
  )
  ORDER BY sm.created_at DESC;
$$;