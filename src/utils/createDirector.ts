import { supabase } from '@/integrations/supabase/client';

export async function createDirectorElvimar() {
  try {
    const { data, error } = await supabase.functions.invoke('create-director-elvimar');
    
    if (error) {
      console.error('Error creating director:', error);
      return { success: false, error: error.message };
    }
    
    return data;
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return { success: false, error: error.message };
  }
}