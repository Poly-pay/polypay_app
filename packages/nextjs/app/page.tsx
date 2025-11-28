"use client";

import Image from "next/image";
import Link from "next/link";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { BugAntIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { Address } from "~~/components/scaffold-eth";

const Home: NextPage = () => {
  const { address: connectedAddress } = useAccount();

  return (
    <>
      <div className="flex items-center flex-col grow pt-10">
        <div className="px-5">
          <h1 className="text-center">
            <span className="block text-2xl mb-2">Welcome to</span>
            <span className="block text-4xl font-bold">Scaffold-ETH 2</span>
            <span className="block text-xl font-bold">(SpeedRunEthereum Challenge: Multisig extension)</span>
          </h1>
          <div className="flex justify-center items-center space-x-2 flex-col">
            <p className="my-2 font-medium">Connected Address:</p>
            <Address address={connectedAddress} />
          </div>

          <div className="flex items-center flex-col flex-grow pt-10">
            <div className="px-5">
              <h1 className="text-center mb-8">
                <span className="block text-2xl mb-2">SpeedRunEthereum</span>
                <span className="block text-4xl font-bold">Challenge: 👛 Multisig Wallet </span>
              </h1>
              <div className="flex flex-col items-center justify-center">
                <Image
                  src="/hero.png"
                  width="727"
                  height="231"
                  alt="challenge banner"
                  className="rounded-xl border-4 border-primary"
                />
                <div className="max-w-3xl">
                  <p className="text-center text-lg mt-8">
                    👩‍👩‍👧‍👧 A multisig wallet it&apos;s a smart contract that acts like a wallet, allowing us to secure
                    assets by requiring multiple accounts to &quot;vote&quot; on transactions. Think of it as a treasure
                    chest that can only be opened when all key parties agree.
                  </p>
                  <p className="text-center text-lg">
                    📜 The contract keeps track of all transactions. Each transaction can be confirmed or rejected by
                    the signers (smart contract owners). Only transactions that receive enough confirmations can be
                    &quot;executed&quot; by the signers.
                  </p>
                  <p className="text-center text-lg">
                    🌟 The final deliverable is a multisig wallet where you can propose adding and removing signers,
                    transferring funds to other accounts, and updating the required number of signers to execute a
                    transaction. After any of the signers propose a transaction, it&apos;s up to the signers to confirm
                    and execute it. Deploy your contracts to a testnet, then build and upload your app to a public web
                    server.
                  </p>
                  <p className="text-center text-lg">
                    💬 Meet other builders working on this challenge and get help in the{" "}
                    <a href="https://t.me/+zKllN8OlGuxmYzFh" target="_blank" rel="noreferrer" className="underline">
                      Multisig Build Cohort telegram
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grow bg-base-300 w-full mt-16 px-8 py-12">
          <div className="flex justify-center items-center gap-12 flex-col md:flex-row">
            <div className="flex flex-col bg-base-100 px-10 py-10 text-center items-center max-w-xs rounded-3xl">
              <BugAntIcon className="h-8 w-8 fill-secondary" />
              <p>
                Tinker with your smart contract using the{" "}
                <Link href="/debug" passHref className="link">
                  Debug Contracts
                </Link>{" "}
                tab.
              </p>
            </div>
            <div className="flex flex-col bg-base-100 px-10 py-10 text-center items-center max-w-xs rounded-3xl">
              <MagnifyingGlassIcon className="h-8 w-8 fill-secondary" />
              <p>
                Explore your local transactions with the{" "}
                <Link href="/blockexplorer" passHref className="link">
                  Block Explorer
                </Link>{" "}
                tab.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
