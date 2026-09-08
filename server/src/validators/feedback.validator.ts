import { validate, validators } from '../middleware/validate';

export const submitFeedbackValidation = validate([
  {
    field: 'type',
    validators: [
      validators.required(),
      validators.string(),
      validators.oneOf(['bug', 'feature', 'general', 'pronunciation']),
    ],
  },
  {
    field: 'message',
    validators: [
      validators.required(),
      validators.string(),
      validators.minLength(10),
      validators.maxLength(2000),
    ],
  },
  {
    field: 'rating',
    validators: [validators.number()],
    optional: true,
  },
]);
