export class AppError extends Error {
  constructor(status, message, details) {
    super(message)
    this.status = status
    this.details = details
    this.expose = true
  }
}
export const badRequest = (m, d) => new AppError(400, m, d)
export const unauthorized = (m = 'Please sign in to continue') => new AppError(401, m)
export const forbidden = (m = 'You do not have permission to do this') => new AppError(403, m)
export const notFound = (m = 'Not found') => new AppError(404, m)
export const conflict = (m) => new AppError(409, m)
export const unprocessable = (m, d) => new AppError(422, m, d)
