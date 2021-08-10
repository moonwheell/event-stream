import * as express from 'express';

function loggerMiddleware(
  { method, path }: express.Request,
  response: express.Response,
  next,
): void {
  console.log(`${method} ${path}`);
  next();
}
export default loggerMiddleware;
