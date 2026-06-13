# Arbitrum Stylus Support

PolyPay supports **Arbitrum One** (42161) and **Arbitrum Sepolia** (421614),
alongside Horizen and Base. All flows work the same — create account, send /
receive ETH and USDC, propose / approve / execute transfers and batch
transfers, and signer management.

The one difference vs. Horizen / Base: on Arbitrum the account contract is
Rust/WASM ([Arbitrum Stylus](https://arbitrum.io/stylus)) instead of Solidity,
and each account is a tiny proxy in front of a shared implementation. This is
invisible to users.

## For end users

No setup — pick "Arbitrum" in the network chooser when creating an account.
Notes specific to Arbitrum:

- **Tokens**: ETH and Circle USDC. Gasless x402 deposits are supported on
  Arbitrum (One 42161 and Sepolia 421614) via the PayAI facilitator, in
  addition to Base.
- **Approval time**: zkVerify publishes the aggregation receipt in ≈2 minutes,
  then the transaction is executable.
- **MetaMask warning**: MetaMask's security checker can't read Stylus bytecode
  and may flag plain ETH transfers as risky even though they succeed. Disable
  "Transaction security alerts", or use Rabby.

## On-chain addresses

**Arbitrum One (42161):**

| Component | Address |
|-----------|---------|
| Stylus impl | `0x49e772bd7efd483c043402331fbf03533852850f` |
| Stylus factory | `0x740b6a46585474eb113f81999c1117e69d4be1be` |
| Circle USDC (native) | `0xaf88d065e77c8cC2239327C5EDb3A432268e5831` |
| zkVerify aggregation | `0xCb47A3C3B9Eb2E549a3F2EA4729De28CafbB2b69` |

**Arbitrum Sepolia (421614):**

| Component | Address |
|-----------|---------|
| Stylus impl | `0x61fddf7cde02d4527b7d1086671d3f948e59f1d1` |
| Stylus factory | `0x73d33f803600087ed1259035f9ff46f16f15c11a` |
| Circle USDC | `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d` |
| zkVerify aggregation | `0xd007494945580eEb25522c8e0b2fa798B3F0FDE2` |
