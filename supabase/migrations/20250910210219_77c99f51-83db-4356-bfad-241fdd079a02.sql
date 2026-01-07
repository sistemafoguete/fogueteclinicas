-- Verificar e criar profiles para usuários existentes que não têm profile
DO $$
DECLARE
    user_rec RECORD;
BEGIN
    -- Buscar usuários que não têm profile
    FOR user_rec IN 
        SELECT DISTINCT u.id, u.email, u.raw_user_meta_data
        FROM auth.users u
        LEFT JOIN public.profiles p ON u.id = p.user_id
        WHERE p.user_id IS NULL
    LOOP
        -- Criar profile para cada usuário sem profile
        INSERT INTO public.profiles (
            user_id, 
            name, 
            email,
            employee_role, 
            phone,
            is_active
        ) VALUES (
            user_rec.id,
            COALESCE(
                user_rec.raw_user_meta_data->>'name', 
                user_rec.raw_user_meta_data->>'full_name',
                split_part(user_rec.email, '@', 1)
            ),
            user_rec.email,
            COALESCE(
                (user_rec.raw_user_meta_data->>'employee_role')::public.employee_role, 
                'staff'::public.employee_role
            ),
            user_rec.raw_user_meta_data->>'phone',
            true
        );
        
        RAISE NOTICE 'Profile criado para usuário: %', user_rec.email;
    END LOOP;
END $$;

-- Verificar se o trigger está ativo
DO $$
BEGIN
    -- Se o trigger não existir, recriá-lo
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'on_auth_user_created'
    ) THEN
        CREATE TRIGGER on_auth_user_created
            AFTER INSERT ON auth.users
            FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
    END IF;
END $$;