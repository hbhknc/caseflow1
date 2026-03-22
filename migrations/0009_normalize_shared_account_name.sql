INSERT OR IGNORE INTO accounts (id, username, created_at, updated_at)
VALUES (
  'account_default',
  'caseflow',
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
);

UPDATE practice_boards
SET account_id = 'account_default'
WHERE account_id = 'account_hbhklaw';

UPDATE accounts
SET username = 'caseflow',
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE id = 'account_default';

DELETE FROM accounts
WHERE id = 'account_hbhklaw';
