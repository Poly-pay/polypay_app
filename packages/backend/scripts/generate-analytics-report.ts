import * as fs from 'fs';
import * as path from 'path';

// Determine network from environment variable (defaults to testnet)
const NETWORK = process.env.NETWORK || 'testnet';

// Explorer URLs configuration
const EXPLORER_CONFIG = {
  mainnet: {
    ZKVERIFY_EXPLORER: 'https://zkverify.subscan.io/tx',
    HORIZEN_EXPLORER_ADDRESS: 'https://horizen.calderaexplorer.xyz/address',
    HORIZEN_EXPLORER_TX: 'https://horizen.calderaexplorer.xyz/tx',
  },
  testnet: {
    ZKVERIFY_EXPLORER: 'https://zkverify-testnet.subscan.io/tx',
    HORIZEN_EXPLORER_ADDRESS:
      'https://horizen-testnet.explorer.caldera.xyz/address',
    HORIZEN_EXPLORER_TX: 'https://horizen-testnet.explorer.caldera.xyz/tx',
  },
};

const config =
  EXPLORER_CONFIG[NETWORK as keyof typeof EXPLORER_CONFIG] ||
  EXPLORER_CONFIG.testnet;
const ZKVERIFY_EXPLORER = config.ZKVERIFY_EXPLORER;
const HORIZEN_EXPLORER_ADDRESS = config.HORIZEN_EXPLORER_ADDRESS;
const HORIZEN_EXPLORER_TX = config.HORIZEN_EXPLORER_TX;

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

function generateCombinedCSV(
  logins: LoginRecord[],
  onchainActions: OnchainRecord[],
  filename: string,
) {
  const header =
    'Timestamp,Action,User Address,Multisig Wallet,TxHash,Explorer Link\n';

  const allRecords: string[] = [];

  logins.forEach((record) => {
    const explorerLink =
      record.zkVerifyTxHash !== 'PENDING'
        ? `${ZKVERIFY_EXPLORER}/${record.zkVerifyTxHash}`
        : 'PENDING';
    allRecords.push(
      `${record.timestamp},LOGIN,${record.address},,${record.zkVerifyTxHash},${explorerLink}`,
    );
  });

  onchainActions.forEach((record) => {
    let explorerLink = 'PENDING';

    if (record.zkVerifyTxHash !== 'PENDING') {
      if (record.action === 'CREATE_ACCOUNT') {
        explorerLink = `${HORIZEN_EXPLORER_ADDRESS}/${record.multisigWallet}`;
      } else if (record.action === 'EXECUTE') {
        explorerLink = `${HORIZEN_EXPLORER_TX}/${record.zkVerifyTxHash}`;
      } else {
        explorerLink = `${ZKVERIFY_EXPLORER}/${record.zkVerifyTxHash}`;
      }
    }

    allRecords.push(
      `${record.timestamp},${record.action},${record.userAddress},${record.multisigWallet},${record.zkVerifyTxHash},${explorerLink}`,
    );
  });

  allRecords.sort((a, b) => {
    const timestampA = a.split(',')[0];
    const timestampB = b.split(',')[0];
    return timestampA.localeCompare(timestampB);
  });

  fs.writeFileSync(filename, header + allRecords.join('\n'), 'utf8');
}

function main() {
  const logPath = path.join(process.cwd(), 'logs', 'user-analytics.log');
  const outputDir = path.join(process.cwd(), 'reports');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(`\n📊 Generating Analytics Report...\n`);
  console.log(`Reading log file: ${logPath}`);

  const { logins, onchainActions } = parseLogFile(logPath);

  const outputFile = path.join(outputDir, 'analytics-report.csv');

  generateCombinedCSV(logins, onchainActions, outputFile);

  console.log(`\n✅ Report generated: ${outputFile}\n`);
  console.log(`Total records: ${logins.length + onchainActions.length}`);
  console.log(`  - LOGIN: ${logins.length}`);

  const actionCounts: Record<string, number> = {};
  onchainActions.forEach((record) => {
    actionCounts[record.action] = (actionCounts[record.action] || 0) + 1;
  });

  Object.keys(actionCounts).forEach((action) => {
    console.log(`  - ${action}: ${actionCounts[action]}`);
  });
  console.log();
}

main();
