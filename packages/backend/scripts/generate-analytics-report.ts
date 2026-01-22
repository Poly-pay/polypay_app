import * as fs from 'fs';
import * as path from 'path';

const ZKVERIFY_EXPLORER = 'https://zkverify-testnet.subscan.io/tx';

interface LoginRecord {
  timestamp: string;
  address: string;
  zkVerifyTxHash: string;
}

interface OnchainRecord {
  timestamp: string;
  action: string;
  userAddress: string;
  multisigWallet: string;
  nonce: string;
  zkVerifyTxHash: string;
}

function parseLogFile(logPath: string): {
  logins: LoginRecord[];
  onchainActions: OnchainRecord[];
} {
  const logins: LoginRecord[] = [];
  const onchainActions: OnchainRecord[] = [];

  if (!fs.existsSync(logPath)) {
    console.log(`Log file not found: ${logPath}`);
    return { logins, onchainActions };
  }

  const content = fs.readFileSync(logPath, 'utf8');
  const lines = content.split('\n').filter((line) => line.trim());

  for (const line of lines) {
    const parts = line.split(' | ');

    if (parts.length < 4) continue;

    const timestamp = parts[0];
    const action = parts[1];

    if (action === 'LOGIN' && parts.length >= 4) {
      logins.push({
        timestamp,
        address: parts[2],
        zkVerifyTxHash: parts[3],
      });
    } else if (parts.length >= 6) {
      onchainActions.push({
        timestamp,
        action,
        userAddress: parts[2],
        multisigWallet: parts[3],
        nonce: parts[4],
        zkVerifyTxHash: parts[5],
      });
    }
  }

  return { logins, onchainActions };
}

function generateCSV(data: LoginRecord[], filename: string) {
  const header = 'Timestamp,Address,zkVerify TxHash,Explorer Link\n';
  const rows = data
    .map((record) => {
      const explorerLink =
        record.zkVerifyTxHash !== 'PENDING'
          ? `${ZKVERIFY_EXPLORER}/${record.zkVerifyTxHash}`
          : 'PENDING';
      return `${record.timestamp},${record.address},${record.zkVerifyTxHash},${explorerLink}`;
    })
    .join('\n');

  fs.writeFileSync(filename, header + rows, 'utf8');
  console.log(`✅ Generated: ${filename}`);
}

function generateOnchainCSV(data: OnchainRecord[], filename: string) {
  const header =
    'Timestamp,Action,User Address,Multisig Wallet,Nonce,zkVerify TxHash,Explorer Link\n';
  const rows = data
    .map((record) => {
      const explorerLink =
        record.zkVerifyTxHash !== 'PENDING'
          ? `${ZKVERIFY_EXPLORER}/${record.zkVerifyTxHash}`
          : 'PENDING';
      return `${record.timestamp},${record.action},${record.userAddress},${record.multisigWallet},${record.nonce},${record.zkVerifyTxHash},${explorerLink}`;
    })
    .join('\n');

  fs.writeFileSync(filename, header + rows, 'utf8');
  console.log(`✅ Generated: ${filename}`);
}

function generateSummaryCSV(
  logins: LoginRecord[],
  onchainActions: OnchainRecord[],
  filename: string,
) {
  const uniqueLoginUsers = new Set(logins.map((r) => r.address)).size;
  const totalLogins = logins.length;

  const actionCounts: Record<string, number> = {};
  const uniqueUsersPerAction: Record<string, Set<string>> = {};
  const uniqueWalletsPerAction: Record<string, Set<string>> = {};

  onchainActions.forEach((record) => {
    actionCounts[record.action] = (actionCounts[record.action] || 0) + 1;

    if (!uniqueUsersPerAction[record.action]) {
      uniqueUsersPerAction[record.action] = new Set();
    }
    uniqueUsersPerAction[record.action].add(record.userAddress);

    if (!uniqueWalletsPerAction[record.action]) {
      uniqueWalletsPerAction[record.action] = new Set();
    }
    uniqueWalletsPerAction[record.action].add(record.multisigWallet);
  });

  const header = 'Metric,Value\n';
  let rows = `Total Logins,${totalLogins}\n`;
  rows += `Unique Login Users,${uniqueLoginUsers}\n`;
  rows += `\n`;

  Object.keys(actionCounts).forEach((action) => {
    rows += `${action} - Total Actions,${actionCounts[action]}\n`;
    rows += `${action} - Unique Users,${uniqueUsersPerAction[action].size}\n`;
    rows += `${action} - Unique Wallets,${uniqueWalletsPerAction[action].size}\n`;
  });

  fs.writeFileSync(filename, header + rows, 'utf8');
  console.log(`✅ Generated: ${filename}`);
}

function main() {
  const logPath = path.join(process.cwd(), 'logs', 'user-analytics.log');
  const outputDir = path.join(process.cwd(), 'reports');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(`\n📊 Generating Analytics Reports...\n`);
  console.log(`Reading log file: ${logPath}`);

  const { logins, onchainActions } = parseLogFile(logPath);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  generateCSV(logins, path.join(outputDir, `logins-${timestamp}.csv`));

  const actionGroups: Record<string, OnchainRecord[]> = {};
  onchainActions.forEach((record) => {
    if (!actionGroups[record.action]) {
      actionGroups[record.action] = [];
    }
    actionGroups[record.action].push(record);
  });

  Object.keys(actionGroups).forEach((action) => {
    generateOnchainCSV(
      actionGroups[action],
      path.join(outputDir, `${action.toLowerCase()}-${timestamp}.csv`),
    );
  });

  generateSummaryCSV(
    logins,
    onchainActions,
    path.join(outputDir, `summary-${timestamp}.csv`),
  );

  console.log(`\n✅ All reports generated in: ${outputDir}\n`);
}

main();
