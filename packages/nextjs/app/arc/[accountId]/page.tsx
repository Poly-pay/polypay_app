"use client";

import { useParams } from "next/navigation";
import ArcAccountPanel from "~~/components/Arc/ArcAccountPanel";

export default function ArcTransferPage() {
  const { accountId } = useParams<{ accountId: string }>();
  return <ArcAccountPanel accountId={accountId} />;
}
