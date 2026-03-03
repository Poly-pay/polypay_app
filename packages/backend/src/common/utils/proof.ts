import { DOMAIN_ID_BY_CHAIN_ID } from '../constants';

export const getDomainId = (chainId: number): number => {
  const id =
    DOMAIN_ID_BY_CHAIN_ID[chainId as keyof typeof DOMAIN_ID_BY_CHAIN_ID];
  if (id === undefined) {
    throw new Error(`Unsupported chainId for domainId: ${chainId}`);
  }
  return id;
};
