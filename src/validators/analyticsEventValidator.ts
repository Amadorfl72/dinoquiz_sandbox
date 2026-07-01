import Joi from 'joi';

const piiFields = ['email', 'name', 'phone', 'address', 'birthdate', 'username'];

const baseEventSchema = Joi.object({
  eventType: Joi.string().valid(
    'app_open', 
    'tooltip_shown', 
    'tooltip_dismissed',
    'partida_iniciada',
    'pregunta_respondida',
    'partida_completada',
    'replay_pulsado',
    'mute_toggled'
  ).required(),
  device_info: Joi.object({
    model: Joi.string().required(),
    os_version: Joi.string().required(),
    language: Joi.string().required(),
    screen_size: Joi.string().required(),
    user_agent: Joi.string().required()
  }).required(),
  session_id: Joi.string().required()
}).unknown(false);

const appOpenSchema = baseEventSchema.keys({
  eventType: Joi.string().valid('app_open').required(),
  first_apertura: Joi.boolean().required()
});

const tooltipSchema = baseEventSchema.keys({
  eventType: Joi.string().valid('tooltip_shown', 'tooltip_dismissed').required(),
  tooltip_id: Joi.string().required()
});

export function validateEvent(event: any) {
  // Check for PII fields
  const hasPII = Object.keys(event).some(key => piiFields.includes(key));
  if (hasPII) {
    return { error: { details: [{ message: 'Event contains prohibited PII fields' }] } };
  }

  // Validate based on event type
  switch (event.eventType) {
    case 'app_open':
      return appOpenSchema.validate(event);
    case 'tooltip_shown':
    case 'tooltip_dismissed':
      return tooltipSchema.validate(event);
    default:
      return baseEventSchema.validate(event);
  }
}