import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { Buffer } from "buffer";
import fs from "fs";
import path from "path";

const API_URL = "https://relayer-api-testnet.horizenlabs.io/api/v1";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const proofUint8 = new Uint8Array(Object.values(body.proof));
    const numberOfPublicInputs = body.publicInputs?.length || 1;

    if (fs.existsSync(path.join(process.cwd(), "public", "circuit", "vkey.json")) === false) {
      await registerVk(body.vk, numberOfPublicInputs);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    const vk = fs.readFileSync(path.join(process.cwd(), "public", "circuit", "vkey.json"), "utf-8");

    const params = {
      proofType: "ultraplonk",
      vkRegistered: true,
      chainId: 11155111,
      proofOptions: {
        numberOfPublicInputs: numberOfPublicInputs,
      },
      proofData: {
        proof: Buffer.from(concatenatePublicInputsAndProof(body.publicInputs, proofUint8)).toString("base64"),
        vk: JSON.parse(vk).vkHash || JSON.parse(vk).meta.vkHash,
      },
    };

    const requestResponse = await axios.post(`${API_URL}/submit-proof/${process.env.API_KEY}`, params);
    console.log(requestResponse.data);

    if (requestResponse.data.optimisticVerify !== "success") {
      console.error("Proof verification failed, check proof artifacts");
      return NextResponse.json({ error: "Proof verification failed" }, { status: 400 });
    }

    while (true) {
      try {
        const jobStatusResponse = await axios.get(
          `${API_URL}/job-status/${process.env.API_KEY}/${requestResponse.data.jobId}`,
        );
        if (jobStatusResponse.data.status === "Aggregated") {
          console.log("Job aggregated successfully");
          console.log(jobStatusResponse.data);
          return NextResponse.json(jobStatusResponse.data);
        } else {
          console.log("Job status: ", jobStatusResponse.data.status);
          console.log("Waiting for job to aggregated...");
          await new Promise(resolve => setTimeout(resolve, 10000)); // Wait for 10 seconds before checking again
        }
      } catch (error) {
        throw error;
      }
    }
  } catch (error: any) {
    console.log(error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

function hexToUint8Array(hex: any) {
  if (hex.startsWith("0x")) hex = hex.slice(2);
  if (hex.length % 2 !== 0) hex = "0" + hex;

  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

function concatenatePublicInputsAndProof(publicInputsHex: any, proofUint8: any) {
  const publicInputBytesArray = publicInputsHex.flatMap((hex: any) => Array.from(hexToUint8Array(hex)));

  const publicInputBytes = new Uint8Array(publicInputBytesArray);

  console.log(publicInputBytes.length, proofUint8.length);

  const newProof = new Uint8Array(publicInputBytes.length + proofUint8.length);
  newProof.set(publicInputBytes, 0);
  newProof.set(proofUint8, publicInputBytes.length);

  return newProof;
}

async function registerVk(vk: any, numberOfPublicInputs: number) {
  const params = {
    proofType: "ultraplonk",
    vk: vk,
    proofOptions: {
      numberOfPublicInputs: numberOfPublicInputs,
    },
  };

  try {
    const res = await axios.post(`${API_URL}/register-vk/${process.env.API_KEY}`, params);
    console.log(res);
    fs.writeFileSync(path.join(process.cwd(), "public", "circuit", "vkey.json"), JSON.stringify(res.data));
  } catch (error: any) {
    console.log(error.response);
    fs.writeFileSync(path.join(process.cwd(), "public", "circuit", "vkey.json"), JSON.stringify(error.response.data));
  }
}
