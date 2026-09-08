import { validate, validators } from '../middleware/validate';

export const createConversationValidation = validate([
  {
    field: 'title',
    validators: [validators.string(), validators.maxLength(200)],
    optional: true,
  },
  {
    field: 'messages',
    validators: [validators.array()],
    optional: true,
  },
]);
