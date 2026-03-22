INSERT INTO matters (
  id, decedent_name, client_name, file_number, stage, created_at, updated_at, last_activity_at, archived, archived_at
) VALUES
  ('matter_seed_001', 'Eleanor Whitfield', 'Marcus Whitfield', 'PR-2026-0014', 'notice_admin', '2026-02-03T14:20:00.000Z', '2026-03-12T16:45:00.000Z', '2026-03-12T16:45:00.000Z', 0, NULL),
  ('matter_seed_002', 'Harold McIntyre', 'Olivia McIntyre', 'PR-2026-0018', 'inventory_collection', '2026-02-10T10:05:00.000Z', '2026-03-14T11:10:00.000Z', '2026-03-14T11:10:00.000Z', 0, NULL),
  ('matter_seed_003', 'Lucille Carver', 'Daniel Carver', 'PR-2026-0021', 'accounting_closing', '2026-02-18T08:30:00.000Z', '2026-03-15T15:00:00.000Z', '2026-03-15T15:00:00.000Z', 0, NULL),
  ('matter_seed_004', 'John Doe', 'Jane Doe', '26 E 000321-950', 'intake', '2026-03-01T13:40:00.000Z', '2026-03-16T09:20:00.000Z', '2026-03-16T09:20:00.000Z', 0, NULL),
  ('matter_seed_005', 'Florence Avery', 'Jon Avery', 'PR-2025-0119', 'accounting_closing', '2025-11-12T11:00:00.000Z', '2026-03-10T12:30:00.000Z', '2026-03-10T12:30:00.000Z', 0, NULL),
  ('matter_seed_006', 'Margaret Sloan', 'Thomas Sloan', 'PR-2025-0084', 'accounting_closing', '2025-07-08T09:15:00.000Z', '2026-01-18T14:30:00.000Z', '2026-01-18T14:30:00.000Z', 1, '2026-01-18T14:30:00.000Z');

UPDATE matters
SET deadline_template_key = CASE id
  WHEN 'matter_seed_004' THEN 'custom_manual_only'
  ELSE 'standard_estate_administration'
END,
qualification_date = CASE id
  WHEN 'matter_seed_001' THEN '2026-02-12'
  WHEN 'matter_seed_002' THEN '2026-02-18'
  WHEN 'matter_seed_003' THEN '2025-12-15'
  WHEN 'matter_seed_005' THEN '2025-11-15'
  WHEN 'matter_seed_006' THEN '2025-07-15'
  ELSE NULL
END,
publication_date = CASE id
  WHEN 'matter_seed_001' THEN '2026-03-08'
  WHEN 'matter_seed_002' THEN '2026-02-28'
  WHEN 'matter_seed_003' THEN '2025-12-28'
  WHEN 'matter_seed_005' THEN '2025-11-23'
  WHEN 'matter_seed_006' THEN '2025-07-22'
  ELSE NULL
END;

INSERT INTO matter_notes (id, matter_id, body, created_at, created_by) VALUES
  ('note_seed_001', 'matter_seed_001', 'Published notice to creditors and logged publication dates.', '2026-03-12T16:45:00.000Z', 'Probate Team'),
  ('note_seed_002', 'matter_seed_001', 'Letters testamentary issued by the clerk.', '2026-03-05T10:15:00.000Z', 'Probate Team'),
  ('note_seed_003', 'matter_seed_002', 'Requested updated account statements from First National.', '2026-03-14T11:10:00.000Z', 'Probate Team'),
  ('note_seed_004', 'matter_seed_003', 'Draft final accounting circulated for internal review.', '2026-03-15T15:00:00.000Z', 'Probate Team'),
  ('note_seed_005', 'matter_seed_005', 'Order approving final report entered. File ready for archive.', '2026-03-10T12:30:00.000Z', 'Probate Team'),
  ('note_seed_006', 'matter_seed_006', 'Matter archived after approved final accounting and discharge order.', '2026-01-18T14:30:00.000Z', 'Probate Team');

INSERT INTO task_items (id, matter_id, body, created_at, completed_at, source_note_id) VALUES
  ('task_seed_001', 'matter_seed_003', 'Prepare final accounting exhibits for attorney review.', '2026-03-15T15:10:00.000Z', NULL, NULL),
  ('task_seed_002', 'matter_seed_004', 'Collect intake packet signatures and confirm venue details.', '2026-03-16T09:30:00.000Z', NULL, NULL);

INSERT INTO matter_deadlines (
  id, matter_id, title, category, due_date, assignee, priority, source_type, notes, template_key, template_item_key, is_overridden, created_at, updated_at, completed_at, completed_by, completed_by_email, completed_by_id, completion_note, dismissed_at, dismissed_by, dismissed_by_email, dismissed_by_id
) VALUES
  ('deadline_seed_001', 'matter_seed_001', 'Publication follow-up', 'Notice to creditors', '2026-04-07', 'Probate Team', 'medium', 'template', NULL, 'standard_estate_administration', 'publication_follow_up', 0, '2026-03-08T09:00:00.000Z', '2026-03-08T09:00:00.000Z', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('deadline_seed_002', 'matter_seed_001', 'Inventory due', 'Inventory', '2026-05-13', 'Marcus Whitfield', 'high', 'template', NULL, 'standard_estate_administration', 'inventory_due', 0, '2026-02-12T14:20:00.000Z', '2026-02-12T14:20:00.000Z', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('deadline_seed_003', 'matter_seed_002', 'Inventory due', 'Inventory', '2026-05-19', 'Olivia McIntyre', 'high', 'template', 'Draft is in progress.', 'standard_estate_administration', 'inventory_due', 1, '2026-02-18T10:05:00.000Z', '2026-03-14T11:10:00.000Z', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('deadline_seed_004', 'matter_seed_002', 'Accounting due', 'Accounting', '2027-02-18', 'Probate Team', 'medium', 'template', NULL, 'standard_estate_administration', 'accounting_due', 0, '2026-02-18T10:05:00.000Z', '2026-02-18T10:05:00.000Z', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('deadline_seed_005', 'matter_seed_003', 'Closing review target', 'Closing', '2026-03-10', 'CaseFlow Demo', 'low', 'template', 'Waiting on one final receipt.', 'standard_estate_administration', 'closing_review_target', 0, '2025-12-15T08:30:00.000Z', '2026-03-15T15:00:00.000Z', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('deadline_seed_006', 'matter_seed_003', 'Draft final accounting exhibits', 'Accounting', '2026-03-17', 'CaseFlow Demo', 'high', 'manual', 'Coordinate with attorney before filing.', NULL, NULL, 0, '2026-03-15T15:10:00.000Z', '2026-03-15T15:10:00.000Z', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('deadline_seed_007', 'matter_seed_005', 'Closing review target', 'Closing', '2026-02-10', 'Probate Team', 'low', 'template', NULL, 'standard_estate_administration', 'closing_review_target', 0, '2025-11-15T11:00:00.000Z', '2026-02-12T09:30:00.000Z', '2026-02-12T09:30:00.000Z', 'Probate Team', NULL, NULL, 'Reviewed and approved for closing packet.', NULL, NULL, NULL, NULL),
  ('deadline_seed_008', 'matter_seed_004', 'Collect qualification documents', 'Intake', '2026-03-24', 'Jane Doe', 'medium', 'manual', 'Need original will and death certificate.', NULL, NULL, 0, '2026-03-16T09:20:00.000Z', '2026-03-16T09:20:00.000Z', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);

INSERT INTO matter_stage_history (id, matter_id, from_stage, to_stage, changed_at, changed_by) VALUES
  ('history_seed_001', 'matter_seed_001', NULL, 'intake', '2026-02-03T14:20:00.000Z', 'Probate Team'),
  ('history_seed_002', 'matter_seed_001', 'intake', 'qualified_opened', '2026-02-21T09:00:00.000Z', 'Probate Team'),
  ('history_seed_003', 'matter_seed_001', 'qualified_opened', 'notice_admin', '2026-03-05T10:10:00.000Z', 'Probate Team'),
  ('history_seed_004', 'matter_seed_002', NULL, 'qualified_opened', '2026-02-10T10:05:00.000Z', 'Probate Team'),
  ('history_seed_005', 'matter_seed_002', 'qualified_opened', 'inventory_collection', '2026-03-01T13:25:00.000Z', 'Probate Team'),
  ('history_seed_006', 'matter_seed_003', NULL, 'notice_admin', '2026-02-18T08:30:00.000Z', 'Probate Team'),
  ('history_seed_007', 'matter_seed_003', 'notice_admin', 'inventory_collection', '2026-02-27T16:10:00.000Z', 'Probate Team'),
  ('history_seed_008', 'matter_seed_003', 'inventory_collection', 'accounting_closing', '2026-03-15T14:55:00.000Z', 'Probate Team'),
  ('history_seed_009', 'matter_seed_004', NULL, 'intake', '2026-03-01T13:40:00.000Z', 'Probate Team'),
  ('history_seed_010', 'matter_seed_005', NULL, 'qualified_opened', '2025-11-12T11:00:00.000Z', 'Probate Team'),
  ('history_seed_011', 'matter_seed_005', 'qualified_opened', 'notice_admin', '2025-12-08T15:00:00.000Z', 'Probate Team'),
  ('history_seed_012', 'matter_seed_005', 'notice_admin', 'inventory_collection', '2026-01-14T09:35:00.000Z', 'Probate Team'),
  ('history_seed_013', 'matter_seed_005', 'inventory_collection', 'accounting_closing', '2026-02-20T10:20:00.000Z', 'Probate Team'),
  ('history_seed_014', 'matter_seed_006', NULL, 'qualified_opened', '2025-07-08T09:15:00.000Z', 'Probate Team'),
  ('history_seed_015', 'matter_seed_006', 'qualified_opened', 'notice_admin', '2025-08-01T10:00:00.000Z', 'Probate Team'),
  ('history_seed_016', 'matter_seed_006', 'notice_admin', 'inventory_collection', '2025-09-12T13:20:00.000Z', 'Probate Team'),
  ('history_seed_017', 'matter_seed_006', 'inventory_collection', 'accounting_closing', '2025-12-15T11:45:00.000Z', 'Probate Team');

INSERT INTO audit_events (id, entity_type, entity_id, action, details_json, created_at) VALUES
  ('audit_seed_001', 'matter', 'matter_seed_001', 'matter.created', '{"stage":"notice_admin"}', '2026-02-03T14:20:00.000Z'),
  ('audit_seed_002', 'matter_note', 'note_seed_001', 'note.created', '{"matterId":"matter_seed_001"}', '2026-03-12T16:45:00.000Z'),
  ('audit_seed_003', 'matter', 'matter_seed_005', 'matter.updated', '{"stage":"accounting_closing"}', '2026-03-10T12:00:00.000Z'),
  ('audit_seed_004', 'matter', 'matter_seed_006', 'matter.archived', '{"archivedAt":"2026-01-18T14:30:00.000Z"}', '2026-01-18T14:30:00.000Z');
