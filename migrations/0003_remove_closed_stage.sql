UPDATE matters
SET stage = 'accounting_closing',
    updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP)
WHERE stage = 'closed';

UPDATE matter_stage_history
SET to_stage = 'accounting_closing'
WHERE to_stage = 'closed';

UPDATE matter_stage_history
SET from_stage = 'accounting_closing'
WHERE from_stage = 'closed';

UPDATE audit_events
SET details_json = REPLACE(details_json, '"closed"', '"accounting_closing"')
WHERE details_json LIKE '%"closed"%';
