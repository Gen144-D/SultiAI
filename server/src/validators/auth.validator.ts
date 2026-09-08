import { validate, validators } from '../middleware/validate';

export const signupValidation = validate([
  {
    field: 'fullname',
    validators: [
      validators.required(),
      validators.string(),
      validators.minLength(2),
      validators.maxLength(100),
    ],
  },
  {
    field: 'email',
    validators: [validators.required(), validators.string(), validators.email()],
  },
  {
    field: 'password',
    validators: [
      validators.required(),
      validators.string(),
      validators.minLength(6),
      validators.maxLength(128),
    ],
  },
]);

export const signinValidation = validate([
  {
    field: 'email',
    validators: [validators.required(), validators.string(), validators.email()],
  },
  {
    field: 'password',
    validators: [validators.required(), validators.string()],
  },
]);
