import { badRequest } from '../utils/errors.js';

/** Validates req.body (or another part of the request) against a zod schema. */
export const validate =
  (schema, part = 'body') =>
  (req, _res, next) => {
    const result = schema.safeParse(req[part]);
    if (!result.success) {
      const details = result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
      return next(badRequest('Validation failed', details));
    }
    req[part] = result.data;
    next();
  };
