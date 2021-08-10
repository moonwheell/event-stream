import { SettingTypeEnum } from '../../settings/enums/setting-type.enum';

export interface StockSettingInterface {
  type: SettingTypeEnum.STOCK_UPDATING;
  isProcessing: boolean;
  uid: number;
}
