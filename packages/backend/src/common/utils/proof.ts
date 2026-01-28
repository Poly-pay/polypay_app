import { NetworkValue } from '@polypay/shared';
import {
  DOMAIN_ID_HORIZEN_MAINNET,
  DOMAIN_ID_HORIZEN_TESTNET,
} from '../constants';

export const getDomainId = (): number => {
  const isMainnet = process.env.NETWORK === NetworkValue.mainnet;
  return isMainnet ? DOMAIN_ID_HORIZEN_MAINNET : DOMAIN_ID_HORIZEN_TESTNET;
};
