import { validate, validators } from '../middleware/validate';

export const addWordValidation = validate([
  {
    field: 'word',
    validators: [
      validators.required(),
      validators.string(),
      validators.minLength(1),
      validators.maxLength(100),
    ],
  },
  {
    field: 'translation',
    validators: [
      validators.required(),
      validators.string(),
      validators.minLength(1),
      validators.maxLength(100),
    ],
  },
  {
    field: 'pronunciation',
    validators: [validators.string(), validators.maxLength(200)],
    optional: true,
  },
  {
    field: 'category',
    validators: [validators.string(), validators.maxLength(50)],
    optional: true,
  },
]);

export const reviewWordValidation = validate([
  {
    field: 'wordId',
    validators: [validators.required(), validators.string()],
  },
  {
    field: 'quality',
    validators: [validators.required(), validators.number()],
  },
]);
