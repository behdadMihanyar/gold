export class HttpError extends Error {
  /**
   * @param {number} status
   * @param {string} message
   * @param {Array}  [details]  validation details
   * @param {{code?: string, data?: object}} [extra]  `code` lets clients branch on
   *        the failure; `data` carries facts they need (e.g. the new price).
   */
  constructor(status, message, details, extra = {}) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.details = details;
    this.code = extra.code;
    this.data = extra.data;
  }

  static badRequest(message = "Bad request", details, extra) {
    return new HttpError(400, message, details, extra);
  }
  static unauthorized(message = "Authentication required") {
    return new HttpError(401, message);
  }
  static forbidden(message = "Forbidden", extra) {
    return new HttpError(403, message, undefined, extra);
  }
  static notFound(message = "Not found") {
    return new HttpError(404, message);
  }
  static conflict(message = "Conflict", extra) {
    return new HttpError(409, message, undefined, extra);
  }
  static unavailable(message = "Service unavailable", extra) {
    return new HttpError(503, message, undefined, extra);
  }
}
