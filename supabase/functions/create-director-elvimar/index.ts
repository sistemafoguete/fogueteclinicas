import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  console.log('Creating director user Elvimar Peixoto');

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Verificar se o usuário já existe
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = existingUsers?.users?.find(
      u => u.email === 'institucional@fundacaodombosco.org'
    );

    if (userExists) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Usuário já existe no sistema',
          user_id: userExists.id
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Criar usuário com email já confirmado
    const { data: createdUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: 'institucional@fundacaodombosco.org',
      password: '123456',
      email_confirm: true,
      user_metadata: {
        name: 'Elvimar Peixoto',
        employee_role: 'director'
      }
    });

    if (createError) {
      console.error('Error creating user:', createError);
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!createdUser.user) {
      console.error('No user created');
      return new Response(
        JSON.stringify({ error: 'Failed to create user' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User created successfully:', createdUser.user.id);

    // Atualizar perfil
    const { error: profileUpdateError } = await supabaseAdmin
      .from('profiles')
      .update({
        name: 'Elvimar Peixoto',
        employee_role: 'director',
        is_active: true,
        unit: 'madre'
      })
      .eq('user_id', createdUser.user.id);

    if (profileUpdateError) {
      console.error('Error updating profile:', profileUpdateError);
      return new Response(
        JSON.stringify({ 
          warning: 'User created but profile update failed',
          error: profileUpdateError.message,
          user_id: createdUser.user.id
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Profile updated successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Usuário Elvimar Peixoto criado com sucesso!',
        credentials: {
          email: 'institucional@fundacaodombosco.org',
          password: '123456'
        },
        user: {
          id: createdUser.user.id,
          email: createdUser.user.email,
          name: 'Elvimar Peixoto',
          employee_role: 'director'
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});