const Joi = require('joi');

const gameCompletedSchema = Joi.object({
  app_version: Joi.string().required().messages({
    'string.empty': 'app_version is required',
    'any.required': 'app_version is required'
  }),
  duration_ms: Joi.number().min(0).required().messages({
    'number.base': 'duration_ms must be a number',
    'number.min': 'duration_ms cannot be negative',
    'any.required': 'duration_ms is required'
  }),
  score: Joi.number().min(0).max(10).required(),
  questions_answered: Joi.number().min(0).max(10).required()
});

function validateGameCompletedEvent(event) {
  return gameCompletedSchema.validate(event, { abortEarly: false });
}

module.exports = { validateGameCompletedEvent };