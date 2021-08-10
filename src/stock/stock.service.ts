import * as sql from 'mssql';
import * as functions from 'firebase-functions';

import { db } from '../config';
import App from '../app';
import { SettingTypeEnum } from '../settings/enums/setting-type.enum';
import { UpdatingStockType } from './types/updating-stock.type';
import { StockSettingInterface } from './interfaces/stock-setting.interface';
import { StreamTypeEnum } from './enums/stream-type.enum';

export default class StockService {
  private readonly productsRef;
  private readonly settingsRef;

  constructor() {
    this.productsRef = db.collection('products');
    this.settingsRef = db.collection('settings');
  }

  public async getStockProducts(): Promise<Array<any>> {
    await App.connectToTheDatabase(StockService.name);

    const sqlProducts = await sql
      .query('SELECT ref, design, event-stream, epv1 FROM st')
      .catch((error) => {
        console.log(`getStockProducts sql error`, JSON.stringify(error));
        throw new functions.https.HttpsError('internal', JSON.stringify(error));
      });

    return sqlProducts.recordset;
  }

  public async getAllProducts(): Promise<any> {
    const snapshot = await this.productsRef.get().catch((error) => {
      console.log('getAllProducts error', JSON.stringify(error));
      throw new functions.https.HttpsError('internal', JSON.stringify(error));
    });

    return {
      reference: this.productsRef,
      snapshot,
    };
  }

  public async updateStock(
    sqlProducts: Array<any>,
    snapshot: any,
    reference: any,
  ): Promise<any> {
    async function* gen() {
      const res = {};
      for await (const doc of snapshot.docs) {
        const productGet = await reference.doc(doc.id).get();
        const product = productGet.data();

        for await (const record of sqlProducts) {
          if (product.product_reference.trim() === record.ref.trim()) {
            const params = {};
            const logParams = {};
            logParams['id'] = product.id;
            logParams['ref'] = record.ref.trim();

            if (product.discount) {
              params['old_price'] = product.old_price;
              params['price'] = product.price;
              logParams['old_price'] = product.old_price;
              logParams['price'] = product.price;
            } else {
              params['old_price'] = record.epv1;
              params['price'] = record.epv1;
              logParams['price'] = record.epv1;
              logParams['old_price'] = record.epv1;
            }
            params['event-stream'] = record.stock;
            logParams['event-stream'] = record.stock;

            if (record.stock) {
              params['available'] = true;
              logParams['available'] = true;
            } else {
              params['available'] = false;
              logParams['available'] = false;
            }
            console.log(logParams);
            await StockService.updateProduct(reference, doc.id, params).catch(
              (error) => {
                res['error'] = error;
              },
            );
            yield (res['data'] = doc.id);
          }
        }
      }
      yield (res['data'] = StreamTypeEnum.END_STREAM);
    }

    return gen();
  }

  private static async updateProduct(
    reference: any,
    docId: string,
    params: any,
  ): Promise<void> {
    await reference
      .doc(docId)
      .update(params)
      .catch((error) => {
        console.log('updateProduct error', JSON.stringify(error));
        throw new functions.https.HttpsError('internal', JSON.stringify(error));
      });
  }

  async getStockUpdating(): Promise<UpdatingStockType> {
    const settingsSnap = await this.settingsRef
      .where('type', '==', SettingTypeEnum.STOCK_UPDATING)
      .get();
    if (settingsSnap.empty) {
      console.log(`${SettingTypeEnum.STOCK_UPDATING} setting not found`);
      throw new functions.https.HttpsError(
        'invalid-argument',
        `${SettingTypeEnum.STOCK_UPDATING} setting not found`,
      );
    }

    return {
      reference: this.settingsRef,
      setting: {
        ...settingsSnap.docs[0].data(),
        uid: settingsSnap.docs[0].id,
      },
    };
  }

  async lockUpdatingStock(
    setting: StockSettingInterface,
    isProcessing: boolean,
  ): Promise<void> {
    await this.settingsRef
      .doc(setting.uid)
      .update({ isProcessing })
      .catch((error) => {
        console.log('lockUpdatingStock error', JSON.stringify(error));
        throw new functions.https.HttpsError('internal', JSON.stringify(error));
      });
  }
}
