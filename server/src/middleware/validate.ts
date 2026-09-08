import { Request, Response, NextFunction } from 'express';
import { errors } from '../utils/apiResponse';

type ValidatorFn = (value: unknown) => string | null;

interface FieldValidator {
  field: string;
  validators: ValidatorFn[];
  optional?: boolean;
}

function isPresent(value: unknown): boolean {
  return value !== undefined && value !== null && value !== '';
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

export const validators = {
  required: (): ValidatorFn => (value) => {
    if (!isPresent(value)) return 'This field is required';
    return null;
  },

  string: (): ValidatorFn => (value) => {
    if (isPresent(value) && !isString(value)) return 'Must be a string';
    return null;
  },

  number: (): ValidatorFn => (value) => {
    if (isPresent(value) && !isNumber(value)) return 'Must be a number';
    return null;
  },

  array: (): ValidatorFn => (value) => {
    if (isPresent(value) && !isArray(value)) return 'Must be an array';
    return null;
  },

  minLength:
    (min: number): ValidatorFn =>
    (value) => {
      if (isString(value) && value.length < min) return `Must be at least ${min} characters`;
      return null;
    },

  maxLength:
    (max: number): ValidatorFn =>
    (value) => {
      if (isString(value) && value.length > max) return `Must be at most ${max} characters`;
      return null;
    },

  email: (): ValidatorFn => (value) => {
    if (isPresent(value) && isString(value)) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) return 'Must be a valid email';
    }
    return null;
  },

  oneOf:
    (allowed: string[]): ValidatorFn =>
    (value) => {
      if (isPresent(value) && !allowed.includes(value as string)) {
        return `Must be one of: ${allowed.join(', ')}`;
      }
      return null;
    },
};

export function validate(validators: FieldValidator[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const body = req.body || {};
    const errorsFound: Record<string, string> = {};

    for (const { field, validators: fieldValidators, optional } of validators) {
      const value = body[field];

      if (!isPresent(value) && optional) {
        continue;
      }

      if (!isPresent(value) && !optional) {
        errorsFound[field] = 'This field is required';
        continue;
      }

      for (const validateFn of fieldValidators) {
        const error = validateFn(value);
        if (error) {
          errorsFound[field] = error;
          break;
        }
      }
    }

    if (Object.keys(errorsFound).length > 0) {
      errors.validation(res, 'Validation failed', errorsFound);
      return;
    }

    next();
  };
}
