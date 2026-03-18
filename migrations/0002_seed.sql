INSERT INTO matters (
  id, decedent_name, client_name, file_number, stage, created_at, updated_at, last_activity_at, archived, archived_at
) VALUES
  ('matter_seed_001', 'Eleanor Whitfield', 'Marcus Whitfield', 'PR-2026-0014', 'notice_admin', '2026-02-03T14:20:00.000Z', '2026-03-12T16:45:00.000Z', '2026-03-12T16:45:00.000Z', 0, NULL),
  ('matter_seed_002', 'Harold McIntyre', 'Olivia McIntyre', 'PR-2026-0018', 'inventory_collection', '2026-02-10T10:05:00.000Z', '2026-03-14T11:10:00.000Z', '2026-03-14T11:10:00.000Z', 0, NULL),
  ('matter_seed_003', 'Lucille Carver', 'Daniel Carver', 'PR-2026-0021', 'accounting_closing', '2026-02-18T08:30:00.000Z', '2026-03-15T15:00:00.000Z', '2026-03-15T15:00:00.000Z', 0, NULL),
  ('matter_seed_004', 'John Doe', 'Jane Doe', '26 E 000321-950', 'intake', '2026-03-01T13:40:00.000Z', '2026-03-16T09:20:00.000Z', '2026-03-16T09:20:00.000Z', 0, NULL),
  ('matter_seed_005', 'Florence Avery', 'Jon Avery', 'PR-2025-0119', 'accounting_closing', '2025-11-12T11:00:00.000Z', '2026-03-10T12:30:00.000Z', '2026-03-10T12:30:00.000Z', 0, NULL),
  ('matter_seed_006', 'Margaret Sloan', 'Thomas Sloan', 'PR-2025-0084', 'accounting_closing', '2025-07-08T09:15:00.000Z', '2026-01-18T14:30:00.000Z', '2026-01-18T14:30:00.000Z', 1, '2026-01-18T14:30:00.000Z');

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

INSERT INTO app_settings (key, value, updated_at) VALUES
  ('deployment_mode', 'private-internal', '2026-03-17T09:00:00.000Z'),
  ('auth_status', 'Cloudflare Access planned', '2026-03-17T09:00:00.000Z'),
  ('boards.registry', '[{"id":"probate","name":"Probate","columnCount":5,"stageLabels":{"intake":"Intake","qualified_opened":"Qualified / Opened","notice_admin":"Notice / Admin","inventory_collection":"Inventory / Collection","accounting_closing":"Accounting / Closing"}}]', '2026-03-17T09:00:00.000Z'),
  ('board.column_count', '5', '2026-03-17T09:00:00.000Z'),
  ('board.stage_label.intake', 'Intake', '2026-03-17T09:00:00.000Z'),
  ('board.stage_label.qualified_opened', 'Qualified / Opened', '2026-03-17T09:00:00.000Z'),
  ('board.stage_label.notice_admin', 'Notice / Admin', '2026-03-17T09:00:00.000Z'),
  ('board.stage_label.inventory_collection', 'Inventory / Collection', '2026-03-17T09:00:00.000Z'),
  ('board.stage_label.accounting_closing', 'Accounting / Closing', '2026-03-17T09:00:00.000Z');

INSERT INTO audit_events (id, entity_type, entity_id, action, details_json, created_at) VALUES
  ('audit_seed_001', 'matter', 'matter_seed_001', 'matter.created', '{"stage":"notice_admin"}', '2026-02-03T14:20:00.000Z'),
  ('audit_seed_002', 'matter_note', 'note_seed_001', 'note.created', '{"matterId":"matter_seed_001"}', '2026-03-12T16:45:00.000Z'),
  ('audit_seed_003', 'matter', 'matter_seed_005', 'matter.updated', '{"stage":"accounting_closing"}', '2026-03-10T12:00:00.000Z'),
  ('audit_seed_004', 'matter', 'matter_seed_006', 'matter.archived', '{"archivedAt":"2026-01-18T14:30:00.000Z"}', '2026-01-18T14:30:00.000Z');
