// ZK Mixer circuit: proves knowledge of (secret, nullifier) such that
// commitment = poseidon(secret, nullifier) is in the Merkle tree,
// and nullifier_hash = poseidon(nullifier, nullifier).
// Public inputs (recipient, token, denomination) are bound to the proof to prevent front-running.

use poseidon::poseidon::bn254::hash_2;

global TREE_DEPTH: u32 = 20;

fn main(
    // Private inputs
    secret: Field,
    nullifier: Field,
    merkle_path: [Field; 20],
    path_indices: [Field; 20],

    // Public inputs (ORDER IS CANONICAL - MUST MATCH CONTRACT)
    merkle_root: pub Field,
    nullifier_hash: pub Field,
    recipient: pub Field,
    token_address: pub Field,
    denomination: pub Field,
) {
    // 1. Verify commitment = poseidon(secret, nullifier)
    //    PolyPay convention: poseidon(x, y) for commitment.
    let commitment = poseidon_hash2(secret, nullifier);

    // 2. Verify nullifier_hash = poseidon(nullifier, nullifier)
    //    We use poseidon_hash2(x, x) (squared-style) to stay consistent with
    //    existing app conventions; do not use poseidon(x, 1) as in some mixers.
    assert(poseidon_hash2(nullifier, nullifier) == nullifier_hash);

    // 3. Verify commitment exists in Merkle tree
    let computed_root = compute_merkle_root(commitment, merkle_path, path_indices);
    assert(computed_root == merkle_root);

    // 4. Public inputs (recipient, token, denomination) are bound to the proof
}

fn poseidon_hash2(a: Field, b: Field) -> Field {
    hash_2([a, b])
}

/// Compute Merkle root from leaf, path siblings, and path indices.
/// path_indices[i] == 0 => current is left child => parent = H(current, sibling)
/// path_indices[i] == 1 => current is right child => parent = H(sibling, current)
fn compute_merkle_root(leaf: Field, merkle_path: [Field; 20], path_indices: [Field; 20]) -> Field {
    let mut current = leaf;
    for i in 0..TREE_DEPTH {
        let sibling = merkle_path[i];
        let is_right = path_indices[i];
        current = (1 - is_right) * poseidon_hash2(current, sibling) + is_right * poseidon_hash2(sibling, current);
    }
    current
}
