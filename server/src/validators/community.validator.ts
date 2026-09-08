import { validate, validators } from '../middleware/validate';

export const createPostValidation = validate([
  {
    field: 'title',
    validators: [
      validators.required(),
      validators.string(),
      validators.minLength(3),
      validators.maxLength(200),
    ],
  },
  {
    field: 'content',
    validators: [
      validators.required(),
      validators.string(),
      validators.minLength(10),
      validators.maxLength(5000),
    ],
  },
]);

export const createResourceValidation = validate([
  {
    field: 'phrase',
    validators: [validators.string(), validators.maxLength(200)],
    optional: true,
  },
  {
    field: 'translation',
    validators: [validators.string(), validators.maxLength(200)],
    optional: true,
  },
  {
    field: 'category',
    validators: [validators.string(), validators.maxLength(50)],
    optional: true,
  },
  {
    field: 'title',
    validators: [
      validators.required(),
      validators.string(),
      validators.minLength(3),
      validators.maxLength(200),
    ],
  },
  {
    field: 'content',
    validators: [
      validators.required(),
      validators.string(),
      validators.minLength(10),
      validators.maxLength(5000),
    ],
  },
]);

export const createCommentValidation = validate([
  {
    field: 'comment',
    validators: [
      validators.required(),
      validators.string(),
      validators.minLength(1),
      validators.maxLength(2000),
    ],
  },
]);

export const verifyRequestValidation = validate([
  {
    field: 'text',
    validators: [validators.string(), validators.maxLength(500)],
    optional: true,
  },
  {
    field: 'audio',
    validators: [validators.string()],
    optional: true,
  },
]);

export const approveVerificationValidation = validate([
  {
    field: 'score',
    validators: [validators.required(), validators.number()],
  },
  {
    field: 'feedback',
    validators: [validators.string(), validators.maxLength(1000)],
    optional: true,
  },
]);
