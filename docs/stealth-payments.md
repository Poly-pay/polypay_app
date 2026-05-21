# Stealth Payments (Umbra)

PolyPay multisigs on Base mainnet can send **ETH privately** using the [Umbra stealth payment protocol](https://app.umbra.cash/). Each send generates a one-time stealth address on the fly, so there's no on-chain link between the sender's multisig and the recipient's real wallet. The recipient withdraws later via the Umbra app.

## Scope

What's supported today:

- **Single transfer**, **ETH only**, **Base mainnet only**
- Recipient must be pre-registered on the Umbra `StealthKeyRegistry` (one-time, via [app.umbra.cash](https://app.umbra.cash))
- Sender uses the standard PolyPay Transfer flow with the "Send privately" toggle enabled

What's intentionally **not** supported:

| Feature | Status | Reason |
|---|---|---|
| Batch stealth sends | ❌ | A multisig `execute` targets a single contract per call. The current PolyPay batch flow routes through the multisig's own `batchTransfer`, which can't be combined with `UmbraBatchSend` in a single execute — we chose not to ship the alternative |
| USDC and other ERC20 stealth | ❌ | `UmbraBatchSend` pulls ERC20 via `safeTransferFrom`, requiring the multisig to first approve `UmbraBatchSend` as spender. We didn't build the one-time approval flow |
| Base Sepolia / Horizen | ❌ | Umbra protocol is only deployed on Base mainnet (among PolyPay's supported chains) |
| In-app stealth key registration | ❌ | Recipients register directly via `app.umbra.cash` so PolyPay holds no relayer key for stealth |

## Sender flow

1. Open **Transfer** on a Base-mainnet multisig.
2. Pick the recipient, enter the ETH amount.
3. Tick **Send privately (stealth)**. The toggle only appears when the recipient is registered on Umbra; otherwise PolyPay shows a hint asking you to share `app.umbra.cash` with them first. A small line under the toggle displays the current Umbra protocol toll the multisig will pay on top of the amount.
4. Submit and proceed with the normal multisig voting flow. Cosigners see a **Private** badge on the transaction so they know it routes through Umbra rather than directly to the recipient.
5. After enough approvals, the transaction executes. If the recipient is also a PolyPay user and has their wallet connected, the transaction row shows them a hint (green dot on the recipient pill + an Open Umbra button in the expanded detail). Otherwise the recipient will need to be told separately to check `app.umbra.cash` — PolyPay does not notify them off-platform.

## Recipient setup (one-time)

Stealth keys are registered on the Umbra `StealthKeyRegistry` once per wallet. PolyPay does not host this flow — recipients use Umbra directly:

1. Sidebar in PolyPay shows a **Receive privately** card whenever the current account is on Base mainnet and a wallet is connected. The card icon and label reflect the wallet's current state:
   - Not registered yet — violet shield, label "Receive privately"
   - Already registered — green shield, label "Private receive ready"
2. Clicking opens a modal that points to [app.umbra.cash](https://app.umbra.cash) and explains the steps. PolyPay does not write to the registry; the recipient signs and submits the registration tx themselves (~$0.01 gas on Base).
3. After registering, the recipient returns to PolyPay and clicks **I've completed setup**. PolyPay re-reads the registry on chain. The modal switches to a success state showing the wallet address (with a copy button to share with senders), and the sidebar card flips to the green "Private receive ready" state so the user always has a one-click handle to revisit their setup.

## Recipient withdrawal

PolyPay does not implement stealth withdrawal — recipients use Umbra. There are two ways to get to the right place:

- **From PolyPay** — if the connected wallet matches the recipient address of an executed stealth transaction, the transaction row shows a small green dot on the recipient pill. Expanding the row reveals an **Open Umbra ↗** button that opens `app.umbra.cash` directly.
- **From anywhere else** — just visit [app.umbra.cash](https://app.umbra.cash). PolyPay isn't required to withdraw.

Either way, the flow on Umbra is:

1. Connect the same wallet that was used during setup.
2. Sign once — Umbra's app scans the `Announcement` events on its contract and finds the payments addressed to you.
3. Withdraw each payment using whatever options Umbra offers — typically a hosted relayer that covers gas (with a fee taken from the withdrawn amount), or a self-paid withdrawal if you already hold ETH on the stealth address. Refer to Umbra's own docs for current details.

## Cost

| Cost | Paid by | Notes |
|---|---|---|
| Stealth payment amount | Multisig | The amount the sender intends the recipient to receive |
| Umbra protocol toll | Multisig | `umbra.toll()` read live on each propose. The multisig sends `amount + toll` ETH to `UmbraBatchSend`; Umbra keeps the toll, the recipient receives the amount. Currently ~0.00003 ETH on Base |
| Execute gas | Relayer | PolyPay's relayer wallet covers the on-chain `multisig.execute(...)` gas, same as any other PolyPay transaction |
| Withdrawal gas (recipient side) | Umbra relayer or recipient | Umbra typically offers a hosted relayer that takes a fee from the withdrawn token, or self-paid withdrawal if the stealth address has ETH. Exact mechanics live on Umbra's side |