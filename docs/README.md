# Introduction

### What is PolyPay?

PolyPay is a privacy-preserving multi-signature wallet that uses zero-knowledge proofs for anonymous transaction signing.

### The Problem

Traditional multisig wallets expose all signer addresses publicly on the blockchain. Anyone can see:

* Who the owners are
* How many signatures are required
* Which addresses approved each transaction

This creates privacy and security risks for organizations and individuals.

### Our Solution

PolyPay replaces public addresses with **commitments** - cryptographic hashes of user secrets. When signing transactions, users generate ZK proofs to prove they are authorized signers **without revealing their identity**.
