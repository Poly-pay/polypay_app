import * as fs from 'fs';
import * as path from 'path';

interface ActionStats {
  uniqueUsers: Set<string>;
  uniqueWallets: Set<string>;
  totalActions: number;
  userActionCount: Map<string, number>;
  walletActionCount: Map<string, number>;
}

interface AllStats {
  approve: ActionStats;
  execute: ActionStats;
  deny: ActionStats;
  addSigner: ActionStats;
  removeSigner: ActionStats;
  updateThreshold: ActionStats;
}

function createEmptyStats(): ActionStats {
  return {
    uniqueUsers: new Set(),
    uniqueWallets: new Set(),
    totalActions: 0,
    userActionCount: new Map(),
    walletActionCount: new Map(),
  };
}

function parseLogFile(logPath: string): AllStats {
  const stats: AllStats = {
    approve: createEmptyStats(),
    execute: createEmptyStats(),
    deny: createEmptyStats(),
    addSigner: createEmptyStats(),
    removeSigner: createEmptyStats(),
    updateThreshold: createEmptyStats(),
  };

  if (!fs.existsSync(logPath)) {
    console.log(`Log file not found: ${logPath}`);
    return stats;
  }

  const content = fs.readFileSync(logPath, 'utf8');
  const lines = content.split('\n').filter((line) => line.trim());

  for (const line of lines) {
    const parts = line.split(' | ');
    if (parts.length < 6) continue;

    const action = parts[1];
    const userAddress = parts[2];
    const walletAddress = parts[3];

    let actionStats: ActionStats | null = null;

    switch (action) {
      case 'APPROVE':
        actionStats = stats.approve;
        break;
      case 'EXECUTE':
        actionStats = stats.execute;
        break;
      case 'DENY':
        actionStats = stats.deny;
        break;
      case 'ADD_SIGNER':
        actionStats = stats.addSigner;
        break;
      case 'REMOVE_SIGNER':
        actionStats = stats.removeSigner;
        break;
      case 'UPDATE_THRESHOLD':
        actionStats = stats.updateThreshold;
        break;
      default:
        continue;
    }

    if (actionStats && userAddress !== 'UNKNOWN') {
      actionStats.totalActions++;
      actionStats.uniqueUsers.add(userAddress);
      actionStats.uniqueWallets.add(walletAddress);

      actionStats.userActionCount.set(
        userAddress,
        (actionStats.userActionCount.get(userAddress) || 0) + 1,
      );
      actionStats.walletActionCount.set(
        walletAddress,
        (actionStats.walletActionCount.get(walletAddress) || 0) + 1,
      );
    }
  }

  return stats;
}

function printStats(stats: AllStats) {
  console.log('\n=== ONCHAIN ACTIONS ANALYTICS ===\n');

  console.log('Summary by Action Type:');
  console.log(
    `✅ APPROVE         | Users: ${stats.approve.uniqueUsers.size.toString().padStart(3)} | Wallets: ${stats.approve.uniqueWallets.size.toString().padStart(3)} | Actions: ${stats.approve.totalActions}`,
  );
  console.log(
    `🚀 EXECUTE         | Users: ${stats.execute.uniqueUsers.size.toString().padStart(3)} | Wallets: ${stats.execute.uniqueWallets.size.toString().padStart(3)} | Actions: ${stats.execute.totalActions}`,
  );
  console.log(
    `❌ DENY            | Users: ${stats.deny.uniqueUsers.size.toString().padStart(3)} | Wallets: ${stats.deny.uniqueWallets.size.toString().padStart(3)} | Actions: ${stats.deny.totalActions}`,
  );
  console.log(
    `➕ ADD_SIGNER      | Users: ${stats.addSigner.uniqueUsers.size.toString().padStart(3)} | Wallets: ${stats.addSigner.uniqueWallets.size.toString().padStart(3)} | Actions: ${stats.addSigner.totalActions}`,
  );
  console.log(
    `➖ REMOVE_SIGNER   | Users: ${stats.removeSigner.uniqueUsers.size.toString().padStart(3)} | Wallets: ${stats.removeSigner.uniqueWallets.size.toString().padStart(3)} | Actions: ${stats.removeSigner.totalActions}`,
  );
  console.log(
    `🔧 UPDATE_THRESHOLD | Users: ${stats.updateThreshold.uniqueUsers.size.toString().padStart(3)} | Wallets: ${stats.updateThreshold.uniqueWallets.size.toString().padStart(3)} | Actions: ${stats.updateThreshold.totalActions}`,
  );

  const allUsers = new Set<string>();
  const allWallets = new Set<string>();

  [
    stats.approve,
    stats.execute,
    stats.deny,
    stats.addSigner,
    stats.removeSigner,
    stats.updateThreshold,
  ].forEach((s) => {
    s.uniqueUsers.forEach((u) => allUsers.add(u));
    s.uniqueWallets.forEach((w) => allWallets.add(w));
  });

  console.log('\nTotals:');
  console.log(`Total Unique Users: ${allUsers.size}`);
  console.log(`Total Unique Wallets: ${allWallets.size}`);

  function printTop10(
    title: string,
    countMap: Map<string, number>,
    emoji: string,
  ) {
    console.log(`\n${title}`);
    const sorted = Array.from(countMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    if (sorted.length === 0) {
      console.log('  No data');
      return;
    }

    sorted.forEach(([addr, count], idx) => {
      console.log(
        `${emoji}  ${(idx + 1).toString().padStart(2)}. ${addr.substring(0, 10)}...${addr.slice(-8)} - ${count} actions`,
      );
    });
  }

  printTop10(
    'Top 10 Active Users (APPROVE):',
    stats.approve.userActionCount,
    '✅',
  );
  printTop10(
    'Top 10 Active Wallets (APPROVE):',
    stats.approve.walletActionCount,
    '✅',
  );
  printTop10(
    'Top 10 Active Users (EXECUTE):',
    stats.execute.userActionCount,
    '🚀',
  );
  printTop10(
    'Top 10 Active Wallets (EXECUTE):',
    stats.execute.walletActionCount,
    '🚀',
  );
  printTop10('Top 10 Active Users (DENY):', stats.deny.userActionCount, '❌');
  printTop10(
    'Top 10 Active Wallets (DENY):',
    stats.deny.walletActionCount,
    '❌',
  );
}

function main() {
  const logPath = path.join(process.cwd(), 'logs', 'user-analytics.log');
  console.log(`Reading log file: ${logPath}`);

  const stats = parseLogFile(logPath);
  printStats(stats);
}

main();
