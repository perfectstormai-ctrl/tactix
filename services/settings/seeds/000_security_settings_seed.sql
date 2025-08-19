INSERT INTO security_settings (id, zero_trust_enabled, updated_at, updated_by)
VALUES (1, FALSE, NOW(), 'seed')
ON CONFLICT (id) DO NOTHING;
