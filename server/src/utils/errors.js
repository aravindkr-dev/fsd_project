export class AppError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const badRequest = (msg, d) => new AppError(400, msg, d);
export const unauthorized = (msg = 'Authentication required') => new AppError(401, msg);
export const forbidden = (msg = 'You do not have permission to do this') => new AppError(403, msg);
export const notFound = (msg = 'Resource not found') => new AppError(404, msg);
export const conflict = (msg) => new AppError(409, msg);
