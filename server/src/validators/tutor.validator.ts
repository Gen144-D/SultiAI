import { validate, validators } from '../middleware/validate';

export const chatValidation = validate([
  {
    field: 'message',
    validators: [validators.string(), validators.maxLength(2000)],
    optional: true,
  },
  {
    field: 'audio',
    validators: [validators.string()],
    optional: true,
  },
  {
    field: 'session_id',
    validators: [validators.string()],
    optional: true,
  },
]);

export const lessonValidation = validate([
  {
    field: 'situation',
    validators: [
      validators.required(),
      validators.string(),
      validators.minLength(3),
      validators.maxLength(500),
    ],
  },
]);

export const pronunciationCheckValidation = validate([
  {
    field: 'text',
    validators: [
      validators.required(),
      validators.string(),
      validators.minLength(1),
      validators.maxLength(1000),
    ],
  },
]);
