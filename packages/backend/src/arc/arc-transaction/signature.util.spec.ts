import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';
import { encodePacked, keccak256 } from 'viem';
import { recoverArcSigner } from './signature.util';

describe('recoverArcSigner', () => {
  it('recovers the signer of an EIP-191 signed tx hash', async () => {
    const account = privateKeyToAccount(generatePrivateKey());
    const wallet = '0x41D925843a192F859cf14aba4789744b1e58eB15';
    const [chainId, nonce, to, value, data] = [
      5042002,
      0,
      account.address,
      10n,
      '0x',
    ] as const;
    const txHash = keccak256(
      encodePacked(
        ['address', 'uint256', 'uint256', 'address', 'uint256', 'bytes'],
        [wallet, BigInt(chainId), BigInt(nonce), to, value, data],
      ),
    );
    const signature = await account.signMessage({ message: { raw: txHash } });
    const recovered = await recoverArcSigner(
      wallet,
      chainId,
      nonce,
      to,
      value,
      data,
      signature,
    );
    expect(recovered.toLowerCase()).toBe(account.address.toLowerCase());
  });

  it('does not recover the signer address when a different signature is used', async () => {
    const account = privateKeyToAccount(generatePrivateKey());
    const other = privateKeyToAccount(generatePrivateKey());
    const wallet = '0x41D925843a192F859cf14aba4789744b1e58eB15';
    const [chainId, nonce, to, value, data] = [
      5042002,
      0,
      account.address,
      10n,
      '0x',
    ] as const;
    const txHash = keccak256(
      encodePacked(
        ['address', 'uint256', 'uint256', 'address', 'uint256', 'bytes'],
        [wallet, BigInt(chainId), BigInt(nonce), to, value, data],
      ),
    );
    const signature = await other.signMessage({ message: { raw: txHash } });
    const recovered = await recoverArcSigner(
      wallet,
      chainId,
      nonce,
      to,
      value,
      data,
      signature,
    );
    expect(recovered.toLowerCase()).not.toBe(account.address.toLowerCase());
  });
});
