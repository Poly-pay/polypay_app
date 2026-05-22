// Binary entrypoint used only for `cargo stylus export-abi` (or
// `cargo run --features export-abi`). For normal WASM builds there is no main.
#![cfg_attr(not(feature = "export-abi"), no_main)]

#[cfg(feature = "export-abi")]
fn main() {
    stylus_sdk::abi::export::print_from_args::<polypay_multisig_stylus::MetaMultiSigWallet>();
}
