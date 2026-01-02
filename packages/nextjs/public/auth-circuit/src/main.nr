use poseidon::poseidon::bn254::hash_2;

/// Auth circuit: proves knowledge of secret for a commitment
/// Private input: secret
/// Public input: commitment
/// Constraint: commitment == poseidon2(secret, secret)
fn main(secret: Field, commitment: pub Field) {
    let computed = hash_2([secret, secret]);
    assert(computed == commitment);
}
