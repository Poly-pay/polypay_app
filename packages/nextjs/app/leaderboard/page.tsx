// Leaderboard is hidden — see #245. Original page kept in git history (commit 894eeac) for restore.
import { redirect } from "next/navigation";

export default function LeaderboardPage() {
  redirect("/dashboard");
}
