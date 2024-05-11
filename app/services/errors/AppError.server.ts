export default class AppError extends Error {
  statusCode: number;

  constructor(message: string, name: string, statusCode = 500) {
    super(message);
    this.name = name;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
