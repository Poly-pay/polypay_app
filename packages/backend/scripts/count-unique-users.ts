#!/usr/bin/env ts-node

/**
 * Count Unique Users Script
 *
 * Purpose: Parse user-analytics.log and count unique wallet addresses
 * Usage: ts-node scripts/count-unique-users.ts
 *
 * Log Format: timestamp | LOGIN | address
 * Example: 2026-01-09T10:30:15.234Z | LOGIN | 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
 */

import * as fs from 'fs';
import * as path from 'path';

const LOG_PATH = path.join(process.cwd(), 'logs', 'user-analytics.log');

interface LoginRecord {
  timestamp: string;
  address: string;
}

/**
 * Parse log file and extract login records
 */
function parseLogFile(filePath: string): LoginRecord[] {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Log file not found: ${filePath}`);
    console.log(
      '\nℹ️  The log file will be created automatically when users start logging in.',
    );
    return [];
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n').filter((line) => line.trim() !== '');

  const records: LoginRecord[] = [];

  lines.forEach((line, index) => {
    // Expected format: timestamp | LOGIN | address
    const match = line.match(/^(.+?)\s*\|\s*LOGIN\s*\|\s*(0x[a-fA-F0-9]+)$/);

    if (match) {
      records.push({
        timestamp: match[1],
        address: match[2],
      });
    } else {
      console.warn(
        `⚠️  Line ${index + 1} has invalid format: ${line.substring(0, 50)}...`,
      );
    }
  });

  return records;
}

/**
 * Count unique addresses
 */
function countUniqueAddresses(records: LoginRecord[]): Set<string> {
  const uniqueAddresses = new Set<string>();

  records.forEach((record) => {
    // Normalize to lowercase for consistent counting
    uniqueAddresses.add(record.address.toLowerCase());
  });

  return uniqueAddresses;
}

/**
 * Get address login count statistics
 */
function getAddressStats(records: LoginRecord[]): Map<string, number> {
  const stats = new Map<string, number>();

  records.forEach((record) => {
    const address = record.address.toLowerCase();
    stats.set(address, (stats.get(address) || 0) + 1);
  });

  return stats;
}

/**
 * Format date range
 */
function getDateRange(
  records: LoginRecord[],
): { first: string; last: string } | null {
  if (records.length === 0) return null;

  const timestamps = records.map((r) => new Date(r.timestamp).getTime());
  const first = new Date(Math.min(...timestamps));
  const last = new Date(Math.max(...timestamps));

  return {
    first: first.toISOString(),
    last: last.toISOString(),
  };
}

/**
 * Main execution
 */
function main() {
  console.log('📊 PolyPay - User Analytics Counter\n');
  console.log(`📁 Reading log file: ${LOG_PATH}\n`);

  // Parse log file
  const records = parseLogFile(LOG_PATH);

  if (records.length === 0) {
    console.log('No login records found.\n');
    return;
  }

  // Count unique addresses
  const uniqueAddresses = countUniqueAddresses(records);

  // Get statistics
  const addressStats = getAddressStats(records);
  const dateRange = getDateRange(records);

  // Display results
  console.log('═══════════════════════════════════════════════════════');
  console.log('                     📈 SUMMARY                         ');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log(`Total Login Events:  ${records.length}`);
  console.log(`Unique Users:        ${uniqueAddresses.size}\n`);

  if (dateRange) {
    console.log(`First Login:         ${dateRange.first}`);
    console.log(`Last Login:          ${dateRange.last}\n`);
  }

  // Show top users by login count
  const sortedStats = Array.from(addressStats.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  if (sortedStats.length > 0) {
    console.log('═══════════════════════════════════════════════════════');
    console.log('              🏆 TOP USERS BY LOGIN COUNT              ');
    console.log('═══════════════════════════════════════════════════════\n');

    sortedStats.forEach(([address, count], index) => {
      const displayAddress = `${address.substring(0, 10)}...${address.substring(address.length - 8)}`;
      console.log(`${index + 1}. ${displayAddress}  →  ${count} logins`);
    });
    console.log();
  }

  console.log('═══════════════════════════════════════════════════════\n');
  console.log('✅ Analysis complete!\n');

  // Privacy reminder
  console.log('🔒 Privacy Note:');
  console.log('   - These addresses are NOT stored in the database');
  console.log('   - No relation to commitments or user accounts');
  console.log('   - Log file is isolated for analytics only\n');
}

// Run the script
main();
