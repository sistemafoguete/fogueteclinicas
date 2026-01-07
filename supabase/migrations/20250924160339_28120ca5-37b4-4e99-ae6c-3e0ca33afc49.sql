-- Remover funcionários específicos do sistema
-- Emails: amandapaola@fundacaodombosco.org, christopher.coelho@fundacaodombosco.org, clinica@fundacaodombosco.org

-- Log da ação para auditoria
INSERT INTO audit_logs (
    user_id,
    entity_type, 
    entity_id,
    action,
    metadata
) VALUES 
    (auth.uid(), 'user_management', 'd137ae9c-fb15-4a07-8a99-3016cd5da132', 'user_deletion', jsonb_build_object('email', 'amandapaola@fundacaodombosco.org', 'name', 'Amanda Paola Lobo Guimarães')),
    (auth.uid(), 'user_management', '14a88df6-c8a3-4214-9fa1-e22827611f05', 'user_deletion', jsonb_build_object('email', 'christopher.coelho@fundacaodombosco.org', 'name', 'Christopher Menezes Coelho')),
    (auth.uid(), 'user_management', 'c2365a4a-b2e1-4e8a-ac3b-05992ce93fb0', 'user_deletion', jsonb_build_object('email', 'clinica@fundacaodombosco.org', 'name', 'Erilaine Ferreira Vital'));

-- Deletar registros de employees
DELETE FROM employees WHERE user_id IN (
    'd137ae9c-fb15-4a07-8a99-3016cd5da132',
    '14a88df6-c8a3-4214-9fa1-e22827611f05', 
    'c2365a4a-b2e1-4e8a-ac3b-05992ce93fb0'
);

-- Deletar registros de profiles  
DELETE FROM profiles WHERE user_id IN (
    'd137ae9c-fb15-4a07-8a99-3016cd5da132',
    '14a88df6-c8a3-4214-9fa1-e22827611f05',
    'c2365a4a-b2e1-4e8a-ac3b-05992ce93fb0'
);