import * as express from 'express';

import { HttpStatus } from '../config';

function errorMiddleware(
  error,
  request: express.Request,
  response: express.Response,
  next: express.NextFunction,
): express.Response {
  console.log('errorMiddleware', error);
  const status = error?.status || HttpStatus.INTERNAL_SERVER_EXCEPTION;
  return response.status(status).send({
    status,
    message: error.message || 'Something went wrong',
  });
}
export default errorMiddleware;
