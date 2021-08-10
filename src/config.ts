import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
admin.initializeApp();
export const fun = functions.region('us-central1');
export const db = admin.firestore();

export enum ResponseStatus {
  SUCCESS = 'Success',
  FAIL = 'Fail',
}

export enum HttpStatus {
  OK = 200,
  NOT_FOUND = 404,
  INTERNAL_SERVER_EXCEPTION = 500,
  BAD_REQUEST = 400,
  UNAVAILABLE = 503,
}

export const configDB = {
  user: '213',
  password: '123',
  server: '123',
  port: 123,
  database: '123',
  options: {
    encrypt: true,
    enableArithAbort: true,
  },
};
