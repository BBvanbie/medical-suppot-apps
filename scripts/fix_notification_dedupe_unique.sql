WITH notification_dedupe_ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY audience_role, COALESCE(team_id, -1), COALESCE(hospital_id, -1), COALESCE(target_user_id, -1), dedupe_key
      ORDER BY created_at DESC, id DESC
    ) AS row_num
  FROM notifications
  WHERE dedupe_key IS NOT NULL
)
DELETE FROM notifications n
USING notification_dedupe_ranked ranked
WHERE n.id = ranked.id
  AND ranked.row_num > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_scope_dedupe_unique
  ON notifications(audience_role, COALESCE(team_id, -1), COALESCE(hospital_id, -1), COALESCE(target_user_id, -1), dedupe_key)
  WHERE dedupe_key IS NOT NULL;
