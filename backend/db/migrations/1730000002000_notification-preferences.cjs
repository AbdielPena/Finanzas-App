/* eslint-disable camelcase */
exports.up = (pgm) => {
  pgm.createTable('notification_preferences', {
    user_id: {
      type: 'uuid',
      primaryKey: true,
      references: '"users"',
      onDelete: 'CASCADE',
    },
    email_enabled:        { type: 'boolean', notNull: true, default: true },
    push_enabled:         { type: 'boolean', notNull: true, default: true },
    in_app_enabled:       { type: 'boolean', notNull: true, default: true },
    daily_summary:        { type: 'boolean', notNull: true, default: false },
    weekly_summary:       { type: 'boolean', notNull: true, default: false },
    alert_payments:       { type: 'boolean', notNull: true, default: true },
    alert_subscriptions:  { type: 'boolean', notNull: true, default: true },
    alert_debts:          { type: 'boolean', notNull: true, default: true },
    alert_card_usage:     { type: 'boolean', notNull: true, default: true },
    card_usage_threshold: { type: 'integer', notNull: true, default: 80 },
    anticipation_days:    { type: 'integer', notNull: true, default: 3 },
    quiet_hours_start:    { type: 'time', notNull: false },
    quiet_hours_end:      { type: 'time', notNull: false },
    push_token:           { type: 'text', notNull: false },
    created_at:           { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at:           { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
};

exports.down = (pgm) => {
  pgm.dropTable('notification_preferences');
};
