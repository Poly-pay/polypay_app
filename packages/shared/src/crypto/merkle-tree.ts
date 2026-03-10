import { poseidonHash2 } from "./poseidon";

const TREE_DEPTH = 20;

let zeroHashes: bigint[] | null = null;

async function getZeroHashes(): Promise<bigint[]> {
  if (zeroHashes) return zeroHashes;
  zeroHashes = [0n];
  for (let i = 1; i <= TREE_DEPTH; i++) {
    const h = await poseidonHash2(zeroHashes[i - 1], zeroHashes[i - 1]);
    zeroHashes.push(h);
  }
  return zeroHashes;
}

/** Exported for zero-hash consistency tests (JS vs Solidity). Same sequence as Mixer.sol. */
export async function getMerkleZeroHashes(): Promise<bigint[]> {
  return getZeroHashes();
}

/**
 * Incremental Merkle tree matching Mixer.sol: same zero-hash sequence and insert algorithm.
 * Zero[0]=0, zero[i]=poseidonHash2(zero[i-1], zero[i-1]). Used to rebuild tree from indexed deposits.
 */
export class IncrementalMerkleTree {
  private leaves: bigint[] = [];
  private zeroHashes: bigint[] = [];
  private initialized = false;

  private async ensureZeroHashes(): Promise<void> {
    if (this.initialized) return;
    this.zeroHashes = await getZeroHashes();
    this.initialized = true;
  }

  async insert(leaf: bigint): Promise<void> {
    await this.ensureZeroHashes();
    this.leaves.push(leaf);
  }

  /**
   * Insert many leaves in order (e.g. from API). Does not compute root until getRoot().
   */
  async insertMany(leaves: bigint[]): Promise<void> {
    await this.ensureZeroHashes();
    this.leaves.push(...leaves);
  }

  /**
   * Replay contract insert algorithm to compute current root.
   */
  async getRoot(): Promise<bigint> {
    await this.ensureZeroHashes();
    if (this.leaves.length === 0) {
      return this.zeroHashes[TREE_DEPTH];
    }
    const filledSubtrees = [...this.zeroHashes.slice(0, TREE_DEPTH)];
    let current = this.leaves[0];
    for (let i = 0; i < TREE_DEPTH; i++) {
      if ((0 >> i) % 2 === 0) {
        filledSubtrees[i] = current;
        current = await poseidonHash2(current, this.zeroHashes[i]);
      } else {
        current = await poseidonHash2(filledSubtrees[i], current);
      }
    }
    for (let leafIndex = 1; leafIndex < this.leaves.length; leafIndex++) {
      current = this.leaves[leafIndex];
      for (let i = 0; i < TREE_DEPTH; i++) {
        if ((leafIndex >> i) % 2 === 0) {
          filledSubtrees[i] = current;
          current = await poseidonHash2(current, this.zeroHashes[i]);
        } else {
          current = await poseidonHash2(filledSubtrees[i], current);
        }
      }
    }
    return current;
  }

  /**
   * Get Merkle path for the leaf at leafIndex (siblings and path indices for circuit).
   * Replays inserts from 0 to leafIndex to capture siblings.
   */
  async getMerklePath(
    leafIndex: number,
  ): Promise<{ siblings: bigint[]; pathIndices: number[] }> {
    await this.ensureZeroHashes();
    if (leafIndex < 0 || leafIndex >= this.leaves.length) {
      throw new Error(
        `Leaf index ${leafIndex} out of range [0, ${this.leaves.length})`,
      );
    }
    const filledSubtrees = this.zeroHashes.slice(0, TREE_DEPTH).map((h) => h);
    const siblings: bigint[] = [];
    const pathIndices: number[] = [];

    for (let index = 0; index <= leafIndex; index++) {
      let current = this.leaves[index];
      siblings.length = 0;
      pathIndices.length = 0;
      for (let i = 0; i < TREE_DEPTH; i++) {
        if ((index >> i) % 2 === 0) {
          siblings.push(this.zeroHashes[i]);
          pathIndices.push(0);
          filledSubtrees[i] = current;
          current = await poseidonHash2(current, this.zeroHashes[i]);
        } else {
          siblings.push(filledSubtrees[i]);
          pathIndices.push(1);
          current = await poseidonHash2(filledSubtrees[i], current);
        }
      }
    }
    return { siblings, pathIndices };
  }

  get leafCount(): number {
    return this.leaves.length;
  }
}
