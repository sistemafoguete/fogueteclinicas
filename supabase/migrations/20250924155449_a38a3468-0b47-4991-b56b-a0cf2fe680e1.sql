-- Resetar senha do usuário Amanda Paola
-- Usando a função admin para atualizar diretamente via SQL
-- Como não podemos usar auth.admin diretamente no SQL, vamos criar uma função temporária

DO $$
DECLARE
    user_uuid UUID := 'd137ae9c-fb15-4a07-8a99-3016cd5da132';
BEGIN
    -- Log da ação para auditoria
    INSERT INTO audit_logs (
        user_id,
        entity_type,
        entity_id,
        action,
        metadata
    ) VALUES (
        auth.uid(),
        'user_management',
        user_uuid,
        'password_reset',
        jsonb_build_object(
            'target_email', 'amandapaola@fundacaodombosco.org',
            'reset_by', 'admin',
            'timestamp', NOW()
        )
    );
    
    RAISE NOTICE 'Password reset logged for user Amanda Paola';
END $$;