const validAppOpenFirstTime = {
  event_type: 'app_open',
  first_apertura: true,
  user_id: 'user-new-001',
  timestamp: '2024-01-15T10:30:00Z',
};

const validAppOpenReturning = {
  event_type: 'app_open',
  first_apertura: false,
  user_id: 'user-returning-001',
  timestamp: '2024-01-15T11:00:00Z',
};

const validTooltipShown = {
  event_type: 'tooltip_shown',
  tooltip_id: 'onboarding_tooltip_1',
  user_id: 'user-456',
  timestamp: '2024-01-15T10:35:00Z',
};

const validTooltipDismissed = {
  event_type: 'tooltip_dismissed',
  tooltip_id: 'onboarding_tooltip_2',
  user_id: 'user-789',
  timestamp: '2024-01-15T10:40:00Z',
};

const piiPayloadWithEmail = {
  event_type: 'app_open',
  first_apertura: true,
  user_id: 'user-123',
  email: 'user@example.com',
  timestamp: '2024-01-15T10:30:00Z',
};

const piiPayloadWithPhone = {
  event_type: 'tooltip_shown',
  tooltip_id: 'onboarding_tooltip_1',
  user_id: 'user-456',
  phone_number: '+1234567890',
  timestamp: '2024-01-15T10:35:00Z',
};

const piiPayloadWithSsn = {
  event_type: 'app_open',
  first_apertura: false,
  user_id: 'user-789',
  ssn: '123-45-6789',
  timestamp: '2024-01-15T10:30:00Z',
};

module.exports = {
  validAppOpenFirstTime,
  validAppOpenReturning,
  validTooltipShown,
  validTooltipDismissed,
  piiPayloadWithEmail,
  piiPayloadWithPhone,
  piiPayloadWithSsn,
};
