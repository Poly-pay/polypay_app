// Base mainnet is the only chain where Umbra is deployed and we operate.
export const STEALTH_CHAIN_ID = 8453;

// ABI fragments — we keep these minimal so we don't ship the full Umbra ABI
// just for two functions.
export const STEALTH_KEY_REGISTRY_ABI = [
  {
    name: 'stealthKeys',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'registrant', type: 'address' }],
    outputs: [
      { name: 'spendingPubKeyPrefix', type: 'uint256' },
      { name: 'spendingPubKey', type: 'uint256' },
      { name: 'viewingPubKeyPrefix', type: 'uint256' },
      { name: 'viewingPubKey', type: 'uint256' },
    ],
  },
  {
    name: 'setStealthKeysOnBehalf',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'registrant', type: 'address' },
      { name: 'spendingPubKeyPrefix', type: 'uint256' },
      { name: 'spendingPubKey', type: 'uint256' },
      { name: 'viewingPubKeyPrefix', type: 'uint256' },
      { name: 'viewingPubKey', type: 'uint256' },
      { name: 'v', type: 'uint8' },
      { name: 'r', type: 'bytes32' },
      { name: 's', type: 'bytes32' },
    ],
    outputs: [],
  },
] as const;
