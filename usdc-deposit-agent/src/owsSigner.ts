import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const SIGNER_PATH = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../signer/ows-signer.mjs");

export interface OwsSignResult {
  signature: string;
  recoveryId: number;
}

/**
 * Thin client over the OWS signer subprocess. The agent never imports the OWS
 * SDK directly and never holds key material — it only passes the scoped token
 * (`ows_key_...`) through to a short-lived child process.
 */
export class OwsSigner {
  constructor(private readonly opts: { wallet: string; apiKey: string }) {}

  /** EVM address of the vault wallet. Read-only — does not need the token. */
  async getAddress(): Promise<string> {
    const out = await this.run(["address"], undefined, { OWS_WALLET: this.opts.wallet });
    return JSON.parse(out).address as string;
  }

  /** Policy-gated EIP-712 signature. Throws POLICY_DENIED if the policy rejects it. */
  async signTypedData(typedDataJson: string): Promise<OwsSignResult> {
    const out = await this.run(["sign"], JSON.stringify({ typedDataJson }), {
      OWS_WALLET: this.opts.wallet,
      OWS_API_KEY: this.opts.apiKey,
    });
    return JSON.parse(out) as OwsSignResult;
  }

  private run(args: string[], stdin: string | undefined, env: Record<string, string>): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn("node", [SIGNER_PATH, ...args], {
        env: { ...process.env, ...env },
        stdio: ["pipe", "pipe", "pipe"],
      });
      let stdout = "";
      let stderr = "";
      child.stdout.on("data", d => (stdout += d));
      child.stderr.on("data", d => (stderr += d));
      child.on("error", reject);
      child.on("close", code => {
        if (code === 0) resolve(stdout);
        else reject(new Error(`OWS signer exited ${code}: ${stderr.trim() || stdout.trim() || "no output"}`));
      });
      if (stdin) child.stdin.write(stdin);
      child.stdin.end();
    });
  }
}
