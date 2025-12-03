use keccak256::keccak256;
use poseidon::poseidon::bn254::hash_2;
global DEPTH: u32 = 4; // Merkle tree depth, supports up to 16 signers (2^4)

/// ZK Circuit for Private Multi-Signature
///
/// This circuit proves that:
/// 1. The prover knows a valid signature for tx_hash
/// 2. The prover is a member of the authorized signers group (merkle tree)
/// 3. The prover has not signed this transaction before (nullifier)
fn main(
    // ============ Private Inputs ============
    signature: [u8; 64], // ECDSA signature (r, s) without recovery byte
    pub_key_x: [u8; 32], // Public key X coordinate (recovered from signature)
    pub_key_y: [u8; 32], // Public key Y coordinate (recovered from signature)
    secret: Field, // Signer's secret (derived from signing "noir-identity" message)
    leaf_index: Field, // Position of signer's commitment in merkle tree
    merkle_path: [Field; DEPTH], // Sibling hashes for merkle proof
    tx_hash_bytes: [u8; 32], // Transaction hash to be signed
    // ============ Public Inputs ============
    tx_hash_commitment: pub Field, // Poseidon hash of tx_hash (for public verification)
    merkle_root: pub Field, // Root of authorized signers tree
    nullifier: pub Field, // Unique identifier to prevent double-signing
) {
    // ============ Step 1: Verify tx_hash commitment ============
    // Public inputs are limited to 32 fields by the verifier API.
    // Since tx_hash is 32 bytes (would be 32 public inputs), we commit it
    // to a single field using Poseidon hash for efficient public verification.
    let tx_hash_field = bytes_to_field(tx_hash_bytes);
    let computed_commitment = poseidon_hash2(tx_hash_field, 1);
    assert(computed_commitment == tx_hash_commitment, "tx_hash mismatch");

    // ============ Step 2: Verify ECDSA signature ============
    // Ethereum's personal_sign adds a prefix before signing.
    // We must reconstruct the same prefixed message to verify the signature.
    // Prefix: "\x19Ethereum Signed Message:\n32"
    let prefix: [u8; 28] = [
        25, 69, 116, 104, 101, 114, 101, 117, 109, 32, 83, 105, 103, 110, 101, 100, 32, 77, 101,
        115, 115, 97, 103, 101, 58, 10, 51, 50,
    ];

    // Concatenate: prefix (28 bytes) + tx_hash (32 bytes) = 60 bytes
    let mut prefixed_msg: [u8; 60] = [0; 60];
    for i in 0..28 {
        prefixed_msg[i] = prefix[i];
    }
    for i in 0..32 {
        prefixed_msg[28 + i] = tx_hash_bytes[i];
    }

    // Hash the prefixed message and verify signature
    let eth_signed_hash = keccak256(prefixed_msg, 60);
    let valid =
        std::ecdsa_secp256k1::verify_signature(pub_key_x, pub_key_y, signature, eth_signed_hash);
    assert(valid, "Invalid signature");

    // ============ Step 3: Verify merkle membership ============
    // Prove that the signer is an authorized member without revealing identity.
    // commitment = hash(secret, secret), stored as leaf in merkle tree during registration.
    let commitment = poseidon_hash2(secret, secret);
    let computed_root = compute_merkle_root(commitment, leaf_index, merkle_path);
    assert(computed_root == merkle_root, "Not a signer");

    // ============ Step 4: Verify nullifier ============
    // Nullifier = hash(secret, tx_hash) ensures:
    // - Same signer + same tx = same nullifier (prevents double-signing)
    // - Different signer or different tx = different nullifier
    // Contract stores used nullifiers to reject duplicates.
    let computed_nullifier = poseidon_hash2(secret, tx_hash_field);
    assert(computed_nullifier == nullifier, "Invalid nullifier");
}

/// Compute merkle root from leaf and proof path
/// Uses little-endian bit decomposition of index to determine left/right ordering
fn compute_merkle_root<let N: u32>(leaf: Field, index: Field, hash_path: [Field; N]) -> Field {
    let index_bits: [u1; N] = index.to_le_bits();
    let mut current = leaf;
    for i in 0..N {
        // bit = 0: current is left child, sibling is right
        // bit = 1: current is right child, sibling is left
        let path_bit = index_bits[i] != 0;
        let (hash_left, hash_right) = if path_bit {
            (hash_path[i], current)
        } else {
            (current, hash_path[i])
        };
        current = poseidon_hash2(hash_left, hash_right);
    }
    current
}

fn poseidon_hash2(a: Field, b: Field) -> Field {
    hash_2([a, b])
}

/// Convert 32-byte array to Field element
/// Note: Result is automatically modulo field prime in Noir
fn bytes_to_field(bytes: [u8; 32]) -> Field {
    let mut result: Field = 0;
    for i in 0..32 {
        result = result * 256 + bytes[i] as Field;
    }
    result
}
