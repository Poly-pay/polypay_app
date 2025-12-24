use keccak256::keccak256;
use poseidon::poseidon::bn254::hash_2;

/// ZK Circuit for Private Multi-Signature
///
/// This circuit proves that:
/// 1. The prover knows a valid signature for tx_hash
/// 2. The prover knows the secret for the given commitment
/// 3. The prover has not signed this transaction before (nullifier)
fn main(
    // ============ Private Inputs ============
    signature: [u8; 64],
    pub_key_x: [u8; 32],
    pub_key_y: [u8; 32],
    secret: Field,
    tx_hash_bytes: [u8; 32],
    
    // ============ Public Inputs ============
    tx_hash_commitment: pub Field,
    commitment: pub Field,
    nullifier: pub Field,
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

    // ============ Step 3: Verify commitment ownership ============
    // Proves: I know the secret for this commitment
    // Contract will check: commitment in signers list?
    let computed_commitment_from_secret = poseidon_hash2(secret, secret);
    assert(computed_commitment_from_secret == commitment, "Invalid commitment");

    // ============ Step 4: Verify nullifier ============
    // Nullifier = hash(secret, tx_hash) ensures:
    // - Same signer + same tx = same nullifier (prevents double-signing)
    // - Different signer or different tx = different nullifier
    // Contract stores used nullifiers to reject duplicates.
    let computed_nullifier = poseidon_hash2(secret, tx_hash_field);
    assert(computed_nullifier == nullifier, "Invalid nullifier");
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