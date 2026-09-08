import { validate, validators } from '../middleware/validate';

export const completeLessonValidation = validate([
  {
    field: 'lessonId',
    validators: [validators.required(), validators.string()],
  },
  {
    field: 'score',
    validators: [validators.required(), validators.number()],
  },
  {
    field: 'duration',
    validators: [validators.number()],
    optional: true,
  },
]);

export const updateStreakValidation = validate([
  {
    field: 'completed',
    validators: [validators.required()],
  },
]);
