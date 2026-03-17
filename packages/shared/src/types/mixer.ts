export interface MixerDepositsParams {
  chainId: number;
  token: string;
  denomination: string;
  fromLeaf?: number;
  toLeaf?: number;
}

export interface MixerDepositsResponse {
  commitments: string[];
  leafIndices: number[];
}

export interface MixerWithdrawParams {
  chainId: number;
  token: string;
  denomination: string;
  recipient: string;
  nullifierHash: string;
  root: string;
  proof: number[];
  publicInputs: string[];
  vk?: string;
}
