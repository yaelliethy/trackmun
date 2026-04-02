-- Initial Registration Config (Settings and Steps)
INSERT INTO councils (id, name, short_name, capacity, created_at, updated_at) VALUES 
('c1', 'Security Council', 'UNSC', 15, (strftime('%s', 'now') * 1000), (strftime('%s', 'now') * 1000)),
('c2', 'Human Rights Council', 'HRC', 47, (strftime('%s', 'now') * 1000), (strftime('%s', 'now') * 1000)),
('c3', 'Economic and Social Council', 'ECOSOC', 54, (strftime('%s', 'now') * 1000), (strftime('%s', 'now') * 1000)),
('c4', 'Disarmament and International Security', 'DISEC', 193, (strftime('%s', 'now') * 1000), (strftime('%s', 'now') * 1000)),
('c5', 'General Assembly', 'GA', 193, (strftime('%s', 'now') * 1000), (strftime('%s', 'now') * 1000)),
('c6', 'Legal Committee', 'LEGAL', 193, (strftime('%s', 'now') * 1000), (strftime('%s', 'now') * 1000)),
('c7', 'Economic and Financial Committee', 'ECOFIN', 193, (strftime('%s', 'now') * 1000), (strftime('%s', 'now') * 1000));

INSERT INTO settings (id, key, value, created_at, updated_at) VALUES 
('s1', 'registration_enabled', 'true', (strftime('%s', 'now') * 1000), (strftime('%s', 'now') * 1000)),
('s2', 'registration_deposit_amount', '500', (strftime('%s', 'now') * 1000), (strftime('%s', 'now') * 1000)),
('s3', 'registration_full_amount', '1500', (strftime('%s', 'now') * 1000), (strftime('%s', 'now') * 1000)),
('s4', 'payment_proof_timing', 'registration', (strftime('%s', 'now') * 1000), (strftime('%s', 'now') * 1000)),
('s5', 'chairs_can_reject', 'true', (strftime('%s', 'now') * 1000), (strftime('%s', 'now') * 1000)),
('s6', 'chairs_can_defer', 'true', (strftime('%s', 'now') * 1000), (strftime('%s', 'now') * 1000));

INSERT INTO registration_steps (id, title, description, "order", created_at, updated_at) VALUES
('step-1', 'Personal Information', 'Tell us about yourself.', 1, (strftime('%s', 'now') * 1000), (strftime('%s', 'now') * 1000)),
('step-2', 'Committee Preferences', 'Choose the councils you want to join.', 2, (strftime('%s', 'now') * 1000), (strftime('%s', 'now') * 1000)),
('step-3', 'Experience', 'Your past MUN experience.', 3, (strftime('%s', 'now') * 1000), (strftime('%s', 'now') * 1000));

INSERT INTO registration_questions (id, step_id, label, type, required, display_order, created_at, updated_at) VALUES
('q1', 'step-1', 'WhatsApp Number', 'text', 1, 1, (strftime('%s', 'now') * 1000), (strftime('%s', 'now') * 1000)),
('q2', 'step-1', 'University/School', 'text', 1, 2, (strftime('%s', 'now') * 1000), (strftime('%s', 'now') * 1000)),
('q3', 'step-2', 'Select Your Councils', 'council_preference', 1, 1, (strftime('%s', 'now') * 1000), (strftime('%s', 'now') * 1000));
