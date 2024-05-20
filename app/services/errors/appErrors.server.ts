/**
 * Explanation of `Object.setPrototypeOf(this, new.target.prototype)`:
 * calling `super(message)` initializes the base `Error` class, this sets up an error instance with
 * all its standard properties (name, message, stack, cause... )
 * Due to how JavaScript's error handling works, (possibly only in transpiled code?) the error
 * instance might(?) not have the correct prototype chain setup, so instead of behaving like
 * a `CategoryCreationError` it will behave like an `Error`. This will cause `instanceof` checks to fail,
 * and prevent the error that's passed back in a `try...catch` block from having access to the custom
 * `statusCode` method.
 *
 * `Object.setPrototypeOf(this, new.target.prototype)` sets the prototype of `this` (the current
 * instance of CategoryCreationError) to `CategoryCreationError.prototype`.
 */

export class ApiError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 500) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, new.target.prototype); // restore the prototype chain
  }
}

export class RedisError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 500) {
    super(message);
    this.name = "RedisError";
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class PrismaError extends Error {
  errorCode: string;
  constructor(message: string, errorCode = "") {
    super(message);
    this.name = "PrismaError";
    this.errorCode = errorCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
