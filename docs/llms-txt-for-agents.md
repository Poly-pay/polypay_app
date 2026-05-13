# PolyPay for AI Agents

PolyPay ships an [llms.txt](https://llmstxt.org) playbook that lets any
AI agent — Claude, ChatGPT, Cursor, autonomous trading bots, custom
LangChain workflows — read, understand, and operate PolyPay through
plain HTTP without you having to write a custom integration.

## What is llms.txt?

[`llms.txt`](https://llmstxt.org) is a simple convention: a single
markdown file at a well-known URL that tells LLMs how to interact with
a service. Think of it as a robots.txt, but for AI agents instead of
crawlers. The agent fetches the file, reads the instructions, and can
then call the right endpoints with the right payloads on its own.

## Live endpoint

```
https://api.polypay.pro/llms.txt
```

Plain text, CORS-enabled, cached for 1 hour. No authentication needed
to read.

## What's inside?

A complete playbook covering the five most common agent flows:

| # | Flow | What the agent can do |
|---|---|---|
| 1 | **Login** | Generate a ZK auth proof and obtain a JWT |
| 2 | **Create multisig account** | Deploy a new PolyPay multisig on Horizen or Base |
| 3 | **Single transfer** | Propose, vote, and execute a private payroll payment |
| 4 | **Batch transfer** | Propose and execute multi-recipient payroll in one transaction |
| 5 | **Gasless USDC deposit (x402)** | Fund any PolyPay multisig with USDC on Base without holding ETH |

Each flow includes the exact HTTP requests, payload shapes, ZK proof
generation snippets (Noir + UltraHonk), and links to the compiled
circuit artifacts the agent needs.

The full live OpenAPI / Swagger spec sits next to it at
`https://api.polypay.pro/swagger` for endpoints not covered in the
playbook.

## How to point an agent at PolyPay

Most agent frameworks support custom system prompts or tools. Two
common ways to wire up PolyPay:

**1. Drop the URL into your prompt.**

> Fetch `https://api.polypay.pro/llms.txt` and use it to send 100 USDC
> from my PolyPay multisig `0x...` to the addresses in
> `recipients.csv`. Sign all proofs with the wallet I'm connected to.

The agent will read the playbook and follow the steps end-to-end.

**2. Add it as a tool / resource.**

If you're building with Claude Code, OpenAI Custom GPTs, Cursor, or any
MCP-compatible agent, register `https://api.polypay.pro/llms.txt` as a
documentation source. The agent gets persistent context for every
session.

## What can agents actually do?

A few non-trivial examples that work out of the box:

- *"Run this week's payroll on PolyPay. Recipients and amounts are in
  the attached CSV. Use my Base mainnet multisig."*
- *"Top up the team's PolyPay treasury with 5,000 USDC from my Base
  wallet, gasless."*
- *"Show me the last 30 days of payroll history for our PolyPay
  multisig, grouped by recipient."*
- *"Propose a transfer of 1 ETH on Horizen to the address from the
  Telegram message, wait for the other signers, then execute when the
  threshold is met."*

## Compatibility

Tested against agents using:

- Anthropic Claude (Claude Code, claude.ai with browsing)
- OpenAI ChatGPT (with browsing or Custom GPT)
- Cursor / Copilot agents that follow `llms.txt`
- LangChain / LangGraph custom agents
- MCP servers exposing the URL as a resource

If your framework can fetch a URL and follow markdown instructions, it
can drive PolyPay.

## For developers

The playbook is generated server-side from
[`packages/backend/src/llms-txt/llms-txt.content.ts`](https://github.com/Poly-pay/polypay_app/blob/develop/packages/backend/src/llms-txt/llms-txt.content.ts).
Updates to the content go through the normal PR flow — the live
endpoint reflects the latest deployed commit on `main`.

Open an issue on
[GitHub](https://github.com/Poly-pay/polypay_app/issues) if you spot an
out-of-date example, a missing flow, or an agent framework that can't
parse the playbook cleanly.
