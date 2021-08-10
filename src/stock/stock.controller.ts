import * as express from 'express';
import * as functions from 'firebase-functions';

import StockService from './stock.service';
import { fun, HttpStatus, ResponseStatus } from '../config';
import { StreamTypeEnum } from './enums/stream-type.enum';

const stockService = new StockService();

const setCorsHeaders = (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'GET');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.set('Access-Control-Max-Age', '3600');
    res.status(204).send('');
  }
};

const updateStockEvent = fun
  .runWith({
    memory: '2GB',
    timeoutSeconds: 300,
  })
  .region('europe-west1')
  .https.onRequest(
    async (req: express.Request, res: express.Response): Promise<void> => {
      setCorsHeaders(req, res);
      res.writeHead(HttpStatus.OK, {
        'Content-Type': 'text/event-stream',
        Connection: 'keep-alive',
        'Cache-Control': 'no-cache',
      });
      const { setting } = await stockService.getStockUpdating();
      if (setting.isProcessing === true) {
        throw new functions.https.HttpsError(
          'internal',
          JSON.stringify('Already in progress. Please try later'),
        );
      } else {
        await stockService.lockUpdatingStock(setting, true);
      }
      try {
        const sqlProducts = await stockService.getStockProducts();
        const { reference, snapshot } = await stockService.getAllProducts();

        const iterator = await stockService.updateStock(
          sqlProducts,
          snapshot,
          reference,
        );
        for await (const item of iterator) {
          res.write(`data: ${JSON.stringify(item)}\n\n`);
          if (item.data === StreamTypeEnum.END_STREAM) {
            console.log(`Connection closed`);
            await stockService.lockUpdatingStock(setting, false);
            res.end();
          }
        }
      } catch (error) {
        await stockService.lockUpdatingStock(setting, false);
        console.log('getAllProducts error', JSON.stringify(error));
        throw new functions.https.HttpsError('internal', JSON.stringify(error));
      }
      req.on('close', async () => {
        console.log(`req.on close`);
        await stockService.lockUpdatingStock(setting, false);
        res.end();
      });
    },
  );

const getProductsCount = async (
  req: express.Request,
  res: express.Response,
): Promise<express.Response> => {
  const { snapshot } = await stockService.getAllProducts();

  return res.status(HttpStatus.OK).send({
    message: ResponseStatus.SUCCESS,
    data: parseInt(snapshot.size),
  });
};

export { updateStockEvent, getProductsCount };
