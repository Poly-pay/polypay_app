import { Contact } from "@polypay/shared";

export interface BatchContactEntry {
  contact: Contact;
  amount: string;
  tokenAddress: string;
  isSynthetic?: boolean;
}

export type Step = 1 | 2 | 3;

export type ResolveToken = (tokenAddress: string) => any;
