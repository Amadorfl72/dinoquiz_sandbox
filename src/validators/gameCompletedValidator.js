const Joi = require('joi');

const gameCompletedSchema = Joi.object({
  app_version: Joi.string().trim().min(1).required().messages({
    'string.base': 'app_version is required',
    'string.empty': 'app_version is required',
    'string.min': 'app_version is required',
    'any.required': 'app_version is required'
  }),
  duration_ms: Joi.number().min(0).required().messages({
    'number.base': 'duration_ms must be a number',
    'number.min': 'duration_ms cannot be negative',
    'any.required': 'duration_ms is required'
  }),
  score: Joi.number().min(0).max(10).required().messages({
    'number.base': 'score is required',
    'number.min': 'score must be between 0 and 10',
    'number.max': 'score must be between 0 and 10',
    'any.required': 'score is required'
  }),
  questions_answered: Joi.number().min(0).max(10).required().messages({
    'number.base': 'questions_answered is required',
    'number.min': 'questions_answered must be between 0 and 10',
    'number.max': 'questions_answered must be between 0 and 10',
    'any.required': 'questions_answered is required'
  })
}).messages({
  'object.base': 'payload is required'
});

function validateGameCompletedEvent(event) {
  return gameCompletedSchema.validate(event, { abortEarly: false });
}

module.exports = { validateGameCompletedEvent };