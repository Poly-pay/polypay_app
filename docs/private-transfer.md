## Private Transfer (User Guide)

### What is Private Transfer?

Private transfer lets you move funds so that:

- **Observers cannot link your deposit wallet to your withdrawal address**
- On-chain, people only see:
  - Someone deposited a fixed amount into a shared pool
  - Later, someone withdrew the same amount to another address
- There is **no on-chain link** between your deposit and your withdrawal.

You can think of it like:

- Putting cash into a shared cash box (the pool)
- Later, taking out the same amount of cash from that box
- People see “someone put money in” and “someone took money out” but not who is who.

---

### What you need

- A wallet connected to **Horizen** or **Base**
- Some funds on that network:
  - ETH / ZEN / USDC (depending on the chain)
- A deployed **PolyPay multisig account** — a shared wallet requiring multiple approvals to send funds. Withdrawing to a multisig keeps your personal wallet fully private while receiving funds into a team-controlled wallet.

---

### Step 1 – Deposit into the Mixer

1. **Open the Mixer screen**
   - Go to the **Mixer** section in the app.

2. **Choose token and amount**
   - Choose the **token**: ETH, ZEN, or USDC.
   - Choose a **fixed denomination** (for example: 0.01 ETH, 1 ZEN, 10 USDC).
   - Fixed amounts ensure all deposits in the pool look identical, which makes it harder to trace individual users.

3. **Confirm the deposit**
   - Click **Deposit**.
   - Your wallet will ask you to confirm the transaction.
   - After the transaction confirms, your funds are in the Mixer pool.

You can repeat this to create multiple deposits (for the same or different pools).

---

### Step 2 – Wait for better privacy

The Mixer provides better privacy when:

- More users deposit into the **same pool** (same token + denomination)
- More deposits and withdrawals happen over time

Practically:

- You can withdraw immediately after depositing.
- However, waiting until the pool has more deposits improves privacy.

---

### Step 3 – Load your deposits

1. Go to the **Withdraw** tab.
2. Select the **same token and denomination** as your deposit.
3. Click **Load my deposits** — the app will find your available deposits.
4. If the app finds deposits for you:
   - A list of “withdrawable deposits” appears; select the one you want to withdraw.

If nothing shows up:

- Make sure you selected the correct token and denomination.
- Check that the deposit transaction has been confirmed on-chain.

---

### Step 4 – Choose recipient

On the Withdraw tab:

**Default recipient**

- If you have a PolyPay multisig account, the app will automatically select your current multisig account as the recipient.

**Change recipient (optional)**

- You can pick another address by:
  - Selecting from the dropdown (if available), or
  - Pasting a custom address into the input box.

**Security tips**

- Double-check the recipient address (especially when pasting).
- If you want stronger separation from your personal wallet, use:
  - A multisig account, or
  - A fresh address created for receiving private transfers.

---

### Step 5 – Withdraw (private)

1. Confirm the recipient is correct.
2. Click **Withdraw** — the app will process your request (this may take few minutes).
3. When processing is complete, the funds will arrive at the recipient address.

You can verify the withdrawal transaction in the network explorer:

- The `from` address will be the relayer, **not** your wallet.

---

### What information is public vs private?

- **Public on-chain:**
  - Deposit event: token, denomination, time, and a deposit record (an anonymous identifier, not linked to your wallet).
  - Withdraw event: token, denomination, time, recipient address, and a withdrawal record (an anonymous identifier for the withdrawal).
- **Kept private:**
  - Which wallet created which deposit.
  - Which deposit corresponds to which withdrawal.
  - The secret proving you own the deposit (stored only in your browser).

For deeper technical details, see:

- [Privacy Architecture](privacy-architecture.md)
- [Zero-Knowledge Implementation](zero-knowledge-implementation.md)
- [Private Transfer Flow (Developer)](developer-documentation/private-transfer-flow.md)

---

### Troubleshooting / FAQ

**Deposit confirmed but not showing in the Withdraw tab?**  
Wait a few minutes and click **Load my deposits** again. The indexer may need some time to catch up.

**Withdrawal failed?**  
Please try again in a few moments. If the problem persists, check the app status or contact support.

**Wrong recipient address?**  
Once a withdrawal is completed, it cannot be reversed. Always double-check the recipient address before clicking **Withdraw**.

**Can I deposit on one network and withdraw on another?**  
No. Deposits and withdrawals must use the same network (and the same token + denomination).

