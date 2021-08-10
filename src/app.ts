import express from 'express';
import * as sql from 'mssql';
import * as functions from 'firebase-functions';

import loggerMiddleware from './middleware/logger.middleware';
import errorMiddleware from './middleware/error.middleware';
import { configDB } from './config';

const cors = require('cors');

const routes = [];

export default class App {
  public app: express.Application;

  constructor() {
    this.app = express();

    App.connectToTheDatabase(App.name).then().catch();
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  public getServer(): express.Application {
    return this.app;
  }

  private initializeMiddlewares(): void {
    this.app.use(cors({ origin: true }));
    this.app.use(express.json());
    this.app.use(
      express.urlencoded({
        extended: true,
      }),
    );
    this.app.use(loggerMiddleware);
  }

  private initializeErrorHandling(): void {
    this.app.use(errorMiddleware);
  }

  private initializeRoutes(): void {
    routes.forEach((route) => {
      this.app.use('/v1', route);
    });
  }

  static async connectToTheDatabase(serviceName: string): Promise<void> {
    return sql
      .connect(configDB)
      .then((e) => {
        console.log(`DB connected for ${serviceName} function`);
      })
      .catch((error) => {
        console.error(
          'db connection ${serviceName} function error',
          JSON.stringify(error),
        );
        throw new functions.https.HttpsError('internal', JSON.stringify(error));
      });
  }
}
