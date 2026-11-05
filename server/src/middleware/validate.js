import { BadRequestError } from '../utils/errors.js';

/**
 * Express middleware to validate request payload using a Zod schema
 */
export function validate(schema, source = 'body') {
  return async (req, res, next) => {
    try {
      const parsed = await schema.parseAsync(req[source]);
      req[source] = parsed;
      next();
    } catch (error) {
      if (error.errors) {
        const details = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));
        return next(new BadRequestError('Validation failed', details));
      }
      return next(error);
    }
  };
}

