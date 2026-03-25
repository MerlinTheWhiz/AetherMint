#!/usr/bin/env node

/**
 * Analytics Query Script
 * Query on-chain analytics data for transparency and reporting
 */

const { Contract, SorobanRpc, Networks, xdr, scValToNative } = require('@stellar/stellar-sdk');
require('dotenv').config();

const rpcUrl = process.env.STELLAR_RPC_URL || 'https://soroban-testnet.stellar.org';
const contractId = process.env.ANALYTICS_CONTRACT_ID;

if (!contractId) {
  console.error('Error: ANALYTICS_CONTRACT_ID not set in environment');
  process.exit(1);
}

const server = new SorobanRpc.Server(rpcUrl);
const contract = new Contract(contractId);

async function simulateCall(functionName, ...args) {
  try {
    const account = await server.getAccount('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF');
    const builtTx = new TransactionBuilder(account, {
      fee: '100',
      networkPassphrase: Networks.TESTNET
    })
      .addOperation(contract.call(functionName, ...args))
      .setTimeout(30)
      .build();

    const simulated = await server.simulateTransaction(builtTx);
    
    if (simulated.result) {
      return scValToNative(simulated.result.retval);
    }
    
    return null;
  } catch (error) {
    console.error(`Error calling ${functionName}:`, error.message);
    return null;
  }
}

function formatBasisPoints(bps) {
  return `${(bps / 100).toFixed(2)}%`;
}

function formatTimestamp(timestamp) {
  return new Date(timestamp * 1000).toISOString();
}

function formatRecord(record) {
  return {
    timestamp: formatTimestamp(record.timestamp),
    totalUsers: record.total_users,
    activeUsers: record.active_users,
    totalCourses: record.total_courses,
    totalCompletions: record.total_completions,
    avgProgress: formatBasisPoints(record.avg_progress_bps),
    avgQuizScore: formatBasisPoints(record.avg_quiz_score_bps),
    totalTimeSpent: `${record.total_time_spent} minutes (${Math.round(record.total_time_spent / 60)} hours)`
  };
}

async function getLatest() {
  console.log('Fetching latest analytics...\n');
  const latest = await simulateCall('get_latest');
  
  if (latest) {
    console.log('Latest Analytics Record:');
    console.log(JSON.stringify(formatRecord(latest), null, 2));
  } else {
    console.log('No data available yet.');
  }
}

async function getHistory() {
  console.log('Fetching full history...\n');
  const history = await simulateCall('get_history');
  
  if (history && history.length > 0) {
    console.log(`Total Records: ${history.length}\n`);
    
    history.forEach((record, index) => {
      console.log(`Record ${index + 1}:`);
      console.log(JSON.stringify(formatRecord(record), null, 2));
      console.log();
    });
  } else {
    console.log('No historical data available.');
  }
}

async function getGrowth() {
  console.log('Calculating growth metrics...\n');
  
  const history = await simulateCall('get_history');
  
  if (!history || history.length < 2) {
    console.log('Insufficient data for growth calculation (need at least 2 records).');
    return;
  }

  const oldest = history[0];
  const latest = history[history.length - 1];
  
  const userGrowth = latest.total_users - oldest.total_users;
  const completionGrowth = latest.total_completions - oldest.total_completions;
  const progressChange = latest.avg_progress_bps - oldest.avg_progress_bps;
  
  console.log('Growth Metrics:');
  console.log({
    period: `${formatTimestamp(oldest.timestamp)} to ${formatTimestamp(latest.timestamp)}`,
    userGrowth: `${userGrowth > 0 ? '+' : ''}${userGrowth}`,
    completionGrowth: `${completionGrowth > 0 ? '+' : ''}${completionGrowth}`,
    progressChange: `${progressChange > 0 ? '+' : ''}${formatBasisPoints(progressChange)}`,
    totalRecords: history.length
  });
}

async function getLastUpdate() {
  console.log('Fetching last update timestamp...\n');
  const timestamp = await simulateCall('get_last_update');
  
  if (timestamp && timestamp > 0) {
    console.log('Last Update:', formatTimestamp(timestamp));
    
    const now = Math.floor(Date.now() / 1000);
    const hoursSince = Math.floor((now - timestamp) / 3600);
    console.log(`Time since last update: ${hoursSince} hours`);
  } else {
    console.log('No updates recorded yet.');
  }
}

async function getAdmin() {
  console.log('Fetching admin address...\n');
  const admin = await simulateCall('get_admin');
  
  if (admin) {
    console.log('Admin Address:', admin);
  } else {
    console.log('Could not retrieve admin address.');
  }
}

async function getSummary() {
  console.log('=== Analytics Summary ===\n');
  
  const [latest, lastUpdate, admin, history] = await Promise.all([
    simulateCall('get_latest'),
    simulateCall('get_last_update'),
    simulateCall('get_admin'),
    simulateCall('get_history')
  ]);

  if (latest) {
    console.log('Current Metrics:');
    console.log(`  Users: ${latest.total_users} (${latest.active_users} active)`);
    console.log(`  Courses: ${latest.total_courses}`);
    console.log(`  Completions: ${latest.total_completions}`);
    console.log(`  Avg Progress: ${formatBasisPoints(latest.avg_progress_bps)}`);
    console.log(`  Avg Quiz Score: ${formatBasisPoints(latest.avg_quiz_score_bps)}`);
    console.log(`  Total Learning Time: ${Math.round(latest.total_time_spent / 60)} hours`);
    console.log();
  }

  if (lastUpdate) {
    console.log('Last Update:', formatTimestamp(lastUpdate));
    const hoursSince = Math.floor((Date.now() / 1000 - lastUpdate) / 3600);
    console.log(`  (${hoursSince} hours ago)`);
    console.log();
  }

  if (history) {
    console.log(`Historical Records: ${history.length}`);
    console.log();
  }

  if (admin) {
    console.log('Admin Address:', admin);
    console.log();
  }

  console.log('Contract ID:', contractId);
  console.log('Network:', rpcUrl);
}

// CLI interface
const command = process.argv[2] || 'summary';

async function main() {
  console.log('=== On-Chain Analytics Query ===\n');

  switch (command) {
    case 'latest':
      await getLatest();
      break;
    case 'history':
      await getHistory();
      break;
    case 'growth':
      await getGrowth();
      break;
    case 'last-update':
      await getLastUpdate();
      break;
    case 'admin':
      await getAdmin();
      break;
    case 'summary':
    default:
      await getSummary();
      break;
  }

  console.log();
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
