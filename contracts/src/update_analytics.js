const { Client } = require('pg');
const { Keypair, Contract, Networks, SorobanRpc, TransactionBuilder, TimeoutInfinite, xdr, scValToNative, nativeToScVal } = require('@stellar/stellar-sdk');
require('dotenv').config();

/**
 * Analytics Update Script
 * Periodically fetches platform metrics from database and stores them on-chain
 * Run via cron job or scheduled task for automated updates
 */

async function fetchDatabaseMetrics(dbClient) {
  console.log('Fetching metrics from database...');
  
  try {
    // Aggregate platform-wide metrics
    const usersRes = await dbClient.query('SELECT COUNT(*) as count FROM users');
    const activeUsersRes = await dbClient.query(
      `SELECT COUNT(DISTINCT user_id) as count FROM user_activity 
       WHERE last_active > NOW() - INTERVAL '30 days'`
    );
    const coursesRes = await dbClient.query('SELECT COUNT(*) as count FROM courses');
    const completionsRes = await dbClient.query(
      'SELECT COUNT(*) as count FROM user_progress WHERE completed = true'
    );
    const progressRes = await dbClient.query('SELECT AVG(progress) as avg FROM user_progress');
    const quizScoreRes = await dbClient.query('SELECT AVG(score) as avg FROM quiz_results');
    const timeSpentRes = await dbClient.query('SELECT SUM(time_spent_minutes) as total FROM user_activity');

    const totalUsers = parseInt(usersRes.rows[0]?.count || '0');
    const activeUsers = parseInt(activeUsersRes.rows[0]?.count || '0');
    const totalCourses = parseInt(coursesRes.rows[0]?.count || '0');
    const totalCompletions = parseInt(completionsRes.rows[0]?.count || '0');
    const avgProgress = parseFloat(progressRes.rows[0]?.avg || '0');
    const avgQuizScore = parseFloat(quizScoreRes.rows[0]?.avg || '0');
    const totalTimeSpent = parseInt(timeSpentRes.rows[0]?.total || '0');

    // Convert percentages to basis points
    const avgProgressBps = Math.round(avgProgress * 100);
    const avgQuizScoreBps = Math.round(avgQuizScore * 100);

    return {
      totalUsers,
      activeUsers,
      totalCourses,
      totalCompletions,
      avgProgressBps,
      avgQuizScoreBps,
      totalTimeSpent
    };
  } catch (error) {
    console.error('Error fetching database metrics:', error);
    throw error;
  }
}

async function fetchLearningOutcomes(dbClient) {
  console.log('Fetching learning outcomes by course...');
  
  try {
    const outcomesRes = await dbClient.query(`
      SELECT 
        c.id as course_id,
        COUNT(DISTINCT up.user_id) as total_enrolled,
        COUNT(DISTINCT CASE WHEN up.completed = true THEN up.user_id END) as completed_count,
        AVG(CASE WHEN qr.score IS NOT NULL THEN qr.score ELSE 0 END) as avg_score
      FROM courses c
      LEFT JOIN user_progress up ON c.id = up.course_id
      LEFT JOIN quiz_results qr ON c.id = qr.course_id AND up.user_id = qr.user_id
      GROUP BY c.id
      LIMIT 10
    `);

    return outcomesRes.rows.map(row => ({
      courseId: row.course_id.substring(0, 9), // Truncate for Symbol
      completionRateBps: Math.round((row.completed_count / row.total_enrolled) * 10000),
      avgScoreBps: Math.round(parseFloat(row.avg_score || '0') * 100),
      totalEnrolled: parseInt(row.total_enrolled)
    }));
  } catch (error) {
    console.error('Error fetching learning outcomes:', error);
    return [];
  }
}

async function submitToBlockchain(metrics, outcomes) {
  console.log('Submitting to blockchain...');
  
  const rpcUrl = process.env.STELLAR_RPC_URL || 'https://soroban-testnet.stellar.org';
  const server = new SorobanRpc.Server(rpcUrl);
  const networkPassphrase = Networks.TESTNET;
  const contractId = process.env.ANALYTICS_CONTRACT_ID;
  const adminKey = process.env.ADMIN_PRIVATE_KEY;

  if (!contractId || !adminKey) {
    throw new Error('Missing ANALYTICS_CONTRACT_ID or ADMIN_PRIVATE_KEY in environment');
  }

  const sourceKeypair = Keypair.fromSecret(adminKey);
  const account = await server.getAccount(sourceKeypair.publicKey());
  const contract = new Contract(contractId);

  // Submit metrics
  console.log('Building transaction for metrics...');
  const metricsTx = new TransactionBuilder(account, { 
    fee: '100000', 
    networkPassphrase 
  })
    .addOperation(contract.call(
      'record_metrics',
      nativeToScVal(metrics.totalUsers, { type: 'u64' }),
      nativeToScVal(metrics.activeUsers, { type: 'u64' }),
      nativeToScVal(metrics.totalCourses, { type: 'u64' }),
      nativeToScVal(metrics.totalCompletions, { type: 'u64' }),
      nativeToScVal(metrics.avgProgressBps, { type: 'u32' }),
      nativeToScVal(metrics.avgQuizScoreBps, { type: 'u32' }),
      nativeToScVal(metrics.totalTimeSpent, { type: 'u64' })
    ))
    .setTimeout(TimeoutInfinite)
    .build();

  // Prepare and simulate
  const preparedTx = await server.prepareTransaction(metricsTx);
  preparedTx.sign(sourceKeypair);

  console.log('Sending metrics transaction...');
  const sendResponse = await server.sendTransaction(preparedTx);

  if (sendResponse.status === 'PENDING') {
    console.log(`✓ Metrics transaction sent! Hash: ${sendResponse.hash}`);
    
    // Wait for confirmation
    let getResponse = await server.getTransaction(sendResponse.hash);
    while (getResponse.status === 'NOT_FOUND') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      getResponse = await server.getTransaction(sendResponse.hash);
    }
    
    if (getResponse.status === 'SUCCESS') {
      console.log('✓ Metrics transaction confirmed!');
    } else {
      console.error('✗ Metrics transaction failed:', getResponse);
    }
  } else {
    console.error('✗ Failed to send metrics transaction:', sendResponse);
  }

  // Submit outcomes if available
  if (outcomes.length > 0) {
    console.log('Submitting learning outcomes...');
    
    const outcomesScVal = nativeToScVal(outcomes.map(o => ({
      course_id: o.courseId,
      completion_rate_bps: o.completionRateBps,
      avg_score_bps: o.avgScoreBps,
      total_enrolled: o.totalEnrolled
    })));

    const account2 = await server.getAccount(sourceKeypair.publicKey());
    const outcomesTx = new TransactionBuilder(account2, { 
      fee: '100000', 
      networkPassphrase 
    })
      .addOperation(contract.call('record_outcomes', outcomesScVal))
      .setTimeout(TimeoutInfinite)
      .build();

    const preparedOutcomesTx = await server.prepareTransaction(outcomesTx);
    preparedOutcomesTx.sign(sourceKeypair);

    const outcomesResponse = await server.sendTransaction(preparedOutcomesTx);
    if (outcomesResponse.status === 'PENDING') {
      console.log(`✓ Outcomes transaction sent! Hash: ${outcomesResponse.hash}`);
    }
  }
}

async function main() {
  console.log('=== Analytics Update Script ===');
  console.log(`Started at: ${new Date().toISOString()}\n`);

  const dbClient = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // Connect to database
    await dbClient.connect();
    console.log('✓ Connected to database\n');
    
    // Fetch metrics
    const metrics = await fetchDatabaseMetrics(dbClient);
    console.log('Metrics gathered:', {
      'Total Users': metrics.totalUsers,
      'Active Users': metrics.activeUsers,
      'Total Courses': metrics.totalCourses,
      'Completions': metrics.totalCompletions,
      'Avg Progress': `${(metrics.avgProgressBps / 100).toFixed(2)}%`,
      'Avg Quiz Score': `${(metrics.avgQuizScoreBps / 100).toFixed(2)}%`,
      'Total Time': `${metrics.totalTimeSpent} minutes`
    });
    console.log();

    // Fetch learning outcomes
    const outcomes = await fetchLearningOutcomes(dbClient);
    console.log(`✓ Fetched ${outcomes.length} course outcomes\n`);

    // Submit to blockchain
    await submitToBlockchain(metrics, outcomes);

    console.log('\n✓ Analytics update completed successfully!');
    process.exit(0);

  } catch (err) {
    console.error('\n✗ Error updating analytics:', err);
    process.exit(1);
  } finally {
    await dbClient.end();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { fetchDatabaseMetrics, fetchLearningOutcomes, submitToBlockchain };