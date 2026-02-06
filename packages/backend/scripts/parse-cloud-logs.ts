import * as fs from 'fs';
import * as path from 'path';

// ============================================
// NETWORK CONFIG - HARDCODED IN FILE
// ============================================

// MAINNET (default)
const NETWORK_CONFIG = {
  ZKVERIFY_EXPLORER: 'https://zkverify.subscan.io/tx',
  HORIZEN_EXPLORER_ADDRESS: 'https://horizen.calderaexplorer.xyz/address',
  HORIZEN_EXPLORER_TX: 'https://horizen.calderaexplorer.xyz/tx',
};

// TESTNET (uncomment below and comment above to use)
// const NETWORK_CONFIG = {
//   ZKVERIFY_EXPLORER: 'https://zkverify-testnet.subscan.io/tx',
//   HORIZEN_EXPLORER_ADDRESS: 'https://horizen-testnet.explorer.caldera.xyz/address',
//   HORIZEN_EXPLORER_TX: 'https://horizen-testnet.explorer.caldera.xyz/tx',
// };

const INPUT_FILE = path.join(process.cwd(), 'logs', 'cloud-export.csv');
const OUTPUT_FILE = path.join(process.cwd(), 'reports', 'analytics-report.csv');

// ============================================
// HELPERS
// ============================================

function getAddressUrl(address: string): string {
  return `${NETWORK_CONFIG.HORIZEN_EXPLORER_ADDRESS}/${address}`;
}

function getTxHashUrl(action: string, txHash: string, accountAddress: string | null): string {
  if (!txHash || txHash === 'PENDING') {
    return 'PENDING';
  }

  switch (action) {
    case 'LOGIN':
      return `${NETWORK_CONFIG.ZKVERIFY_EXPLORER}/${txHash}`;
    case 'CREATE_ACCOUNT':
      // Link to multisig wallet address
      return accountAddress 
        ? `${NETWORK_CONFIG.HORIZEN_EXPLORER_ADDRESS}/${accountAddress}`
        : 'PENDING';
    case 'EXECUTE':
      return `${NETWORK_CONFIG.HORIZEN_EXPLORER_TX}/${txHash}`;
    default:
      // APPROVE, DENY, etc. → zkVerify
      return `${NETWORK_CONFIG.ZKVERIFY_EXPLORER}/${txHash}`;
  }
}

function extractJsonFromLine(line: string): any | null {
  try {
    // Find JSON pattern: {""eventType"":""ANALYTICS"",...}
    // Cloud CSV escapes quotes as ""
    const jsonMatch = line.match(/\{""eventType"":""ANALYTICS""[^}]+\}/);
    if (jsonMatch) {
      // Replace "" with " to get valid JSON
      const jsonStr = jsonMatch[0].replace(/""/g, '"');
      return JSON.parse(jsonStr);
    }
    return null;
  } catch {
    return null;
  }
}

// Simple CSV stringify
function stringifyCSV(
  data: Record<string, string>[],
  columns: string[],
): string {
  const header = columns.join(',');
  const rows = data.map((row) =>
    columns.map((col) => `"${(row[col] || '').replace(/"/g, '""')}"`).join(','),
  );
  return [header, ...rows].join('\n');
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('📊 Parse Cloud Logs to Analytics Report');
  console.log('========================================');
  console.log(`zkVerify Explorer:  ${NETWORK_CONFIG.ZKVERIFY_EXPLORER}`);
  console.log(`Horizen Explorer:   ${NETWORK_CONFIG.HORIZEN_EXPLORER_TX}`);
  console.log(`Input:              ${INPUT_FILE}`);
  console.log(`Output:             ${OUTPUT_FILE}`);
  console.log('');

  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`❌ Input file not found: ${INPUT_FILE}`);
    process.exit(1);
  }

  const content = fs.readFileSync(INPUT_FILE, 'utf-8');
  const lines = content.split('\n');

  console.log(`📄 Found ${lines.length} lines`);

  const analyticsRows: Record<string, string>[] = [];
  let skipped = 0;

  // Skip header (line 0)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) {
      skipped++;
      continue;
    }

    const jsonData = extractJsonFromLine(line);
    if (!jsonData) {
      skipped++;
      continue;
    }

    const { action, userAddress, accountAddress, txHash, timestamp } = jsonData;

    analyticsRows.push({
      Timestamp: timestamp || '',
      Action: action || '',
      'User Address': userAddress ? getAddressUrl(userAddress) : '',
      'Multisig Wallet': accountAddress ? getAddressUrl(accountAddress) : '',
      'TX Hash': getTxHashUrl(action, txHash, accountAddress),
    });
  }

  console.log(`✅ Processed ${analyticsRows.length} analytics events`);
  console.log(`⏭️  Skipped ${skipped} non-analytics lines`);

  // Sort by timestamp (oldest first, like original script)
  analyticsRows.sort(
    (a, b) => new Date(a.Timestamp).getTime() - new Date(b.Timestamp).getTime(),
  );

  // Ensure output dir
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  // Write CSV
  const csvOutput = stringifyCSV(analyticsRows, [
    'Timestamp',
    'Action',
    'User Address',
    'Multisig Wallet',
    'TX Hash',
  ]);
  fs.writeFileSync(OUTPUT_FILE, csvOutput);

  console.log(`\n📁 Saved: ${OUTPUT_FILE}`);

  // Summary by action
  const actionCounts: Record<string, number> = {};
  for (const row of analyticsRows) {
    actionCounts[row.Action] = (actionCounts[row.Action] || 0) + 1;
  }

  console.log('\n📈 Summary by Action:');
  for (const [action, count] of Object.entries(actionCounts).sort(
    (a, b) => b[1] - a[1],
  )) {
    console.log(`   ${action}: ${count}`);
  }
  console.log(`\n   Total: ${analyticsRows.length}`);
}

main().catch(console.error);
