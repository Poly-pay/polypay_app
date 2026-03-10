"use client";

import { useCallback, useMemo } from "react";
import { IncrementalMerkleTree } from "@polypay/shared";

/**
 * Rebuild Merkle tree from indexed deposits (commitments in order) and get root/path for a leaf index.
 */
export function useMerkleTree() {
  const buildTree = useCallback(async (commitmentsHex: string[]) => {
    const tree = new IncrementalMerkleTree();
    const leaves = commitmentsHex.map((c) => (c.startsWith("0x") ? BigInt(c) : BigInt("0x" + c)));
    await tree.insertMany(leaves);
    return tree;
  }, []);

  const getRootAndPath = useCallback(
    async (
      commitmentsHex: string[],
      leafIndex: number,
    ): Promise<{ root: bigint; siblings: bigint[]; pathIndices: number[] }> => {
      const tree = await buildTree(commitmentsHex);
      const root = await tree.getRoot();
      const { siblings, pathIndices } = await tree.getMerklePath(leafIndex);
      return { root, siblings, pathIndices };
    },
    [buildTree],
  );

  return useMemo(
    () => ({
      buildTree,
      getRootAndPath,
    }),
    [buildTree, getRootAndPath],
  );
}
