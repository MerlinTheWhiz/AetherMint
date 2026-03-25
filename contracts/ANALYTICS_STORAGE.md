# Analytics Storage Smart Contract

## Overview

The Analytics Storage smart contract provides transparent, immutable storage of platform-wide learning analytics on the Stellar blockchain. This ensures data integrity, public accessibility, and historical tracking of educational outcomes.

## Features

### 1. Platform-Wide Analytics
- Total and active user counts
- Course catalog size
- Completion statistics
- Average progress tracking
- Quiz performance metrics
- Time spent analytics

### 2. Learning Outcomes
- Per-course completion rates
- Average scores by course
- Enrollment statistics
- Performance trends

### 3. Historical Data
- Immutable record of all metrics over time
- Time-range queries for trend analysis
- Growth metrics calculation
- Last update timestamp tracking

### 4. Public Transparency
- All data publicly queryable
- No authentication required for reads
- Admin address publicly visible
- Verifiable data integrity

## Contract Functions

### Administrative Functions

#### `initialize(admin: Address)`
Initialize the contract with an admin address. Can only be called once.

#### `record_metrics(total_users, active_users, total_courses, total_completions, avg_progress_bps, avg_quiz_score_bps, total_time_spent)`
Record new platform-wide analytics. Admin only.

**Parameters:**
- `total_users` (u64): Total registered users
- `active_users` (u64): Users active in last 30 days
- `total_courses` (u64): Total courses available
- `total_completions` (u64): Total course completions
- `avg_progress_bps` (u32): Average progress in basis points (0-10000)
- `avg_quiz_score_bps` (u32): Average quiz score in basis points (0-10000)
- `total_time_spent` (u64): Total learning time in minutes

#### `record_outcomes(outcomes: Vec<LearningOutcome>)`
Record learning outcomes for multiple courses. Admin only.

### Public Query Functions

#### `get_latest() -> Option<AnalyticsRecord>`
Get the most recent analytics snapshot.

#### `get_history() -> Vec<AnalyticsRecord>`
Get complete historical analytics data.

#### `get_history_range(start_time: u64, end_time: u64) -> Vec<AnalyticsRecord>`
Get analytics records within a specific time range.

#### `get_outcomes(timestamp: u64) -> Option<Vec<LearningOutcome>>`
Get learning outcomes recorded at a specific timestamp.

#### `get_last_update() -> u64`
Get the timestamp of the last analytics update.

#### `get_growth_metrics(period1_start, period1_end, period2_start, period2_end) -> Option<(i64, i64, i64)>`
Calculate growth between two time periods.

**Returns:** `(user_growth, completion_growth, progress_change_bps)`

#### `get_admin() -> Address`
Get the admin address (public for transparency).

## Data Structures

### AnalyticsRecord
```rust
{
    timestamp: u64,
    total_users: u64,
    active_users: u64,
    total_courses: u64,
    total_completions: u64,
    avg_progress_bps: u32,
    avg_quiz_score_bps: u32,
    total_time_spent: u64,
}
```

### LearningOutcome
```rust
{
    course_id: Symbol,
    completion_rate_bps: u32,
    avg_score_bps: u32,
    total_enrolled: u64,
}
```

## Deployment

### Prerequisites
- Stellar CLI installed
- Rust toolchain with wasm32 target
- Admin keypair for contract management

### Build
```bash
cd contracts
cargo build --target wasm32-unknown-unknown --release
```

### Deploy
```bash
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/analytics_storage.wasm \
  --source ADMIN_SECRET_KEY \
  --network testnet
```

### Initialize
```bash
stellar contract invoke \
  --id CONTRACT_ID \
  --source ADMIN_SECRET_KEY \
  --network testnet \
  -- initialize \
  --admin ADMIN_PUBLIC_KEY
```

## Automated Updates

The `update_analytics.js` script automates periodic updates to the contract.

### Setup

1. Configure environment variables:
```bash
DATABASE_URL=postgresql://user:pass@host:5432/dbname
STELLAR_RPC_URL=https://soroban-testnet.stellar.org
ANALYTICS_CONTRACT_ID=C...
ADMIN_PRIVATE_KEY=S...
```

2. Install dependencies:
```bash
npm install pg @stellar/stellar-sdk dotenv
```

3. Run manually:
```bash
node contracts/src/update_analytics.js
```

4. Schedule with cron (daily at 2 AM):
```bash
0 2 * * * cd /path/to/project && node contracts/src/update_analytics.js >> /var/log/analytics-update.log 2>&1
```

## Gas Optimization

The contract is optimized for gas efficiency:

- Uses basis points (u32) instead of floats for percentages
- Efficient vector operations for history storage
- Minimal storage keys with instance storage
- Batch operations for outcomes

**Estimated costs (Testnet):**
- `record_metrics`: ~0.0001 XLM
- `record_outcomes` (10 courses): ~0.0002 XLM
- Query operations: Free (read-only)

## Security Considerations

1. **Admin Control**: Only the admin can write data
2. **Initialization Lock**: Contract can only be initialized once
3. **Public Reads**: All data is publicly accessible (by design)
4. **Data Integrity**: Blockchain ensures immutability
5. **No PII**: Only aggregate, anonymized metrics are stored

## Testing

Run the test suite:
```bash
cd contracts
cargo test
```

Tests cover:
- Initialization and access control
- Metrics recording and retrieval
- Historical data tracking
- Time-range queries
- Learning outcomes
- Growth calculations
- Public transparency
- Re-initialization prevention

## Integration Example

### JavaScript/TypeScript
```javascript
const { Contract, SorobanRpc } = require('@stellar/stellar-sdk');

const server = new SorobanRpc.Server('https://soroban-testnet.stellar.org');
const contract = new Contract(CONTRACT_ID);

// Get latest analytics
const tx = await contract.call('get_latest');
const result = await server.simulateTransaction(tx);
console.log('Latest metrics:', result);

// Get historical data
const historyTx = await contract.call('get_history');
const history = await server.simulateTransaction(historyTx);
console.log('Historical data:', history);
```

### Frontend Dashboard
```typescript
async function fetchAnalytics() {
  const latest = await contract.get_latest();
  
  return {
    users: latest.total_users,
    activeUsers: latest.active_users,
    courses: latest.total_courses,
    completions: latest.total_completions,
    avgProgress: latest.avg_progress_bps / 100, // Convert to percentage
    avgScore: latest.avg_quiz_score_bps / 100,
    totalHours: Math.round(latest.total_time_spent / 60)
  };
}
```

## Roadmap

Future enhancements:
- [ ] Event emission for real-time updates
- [ ] Aggregated statistics functions (min, max, median)
- [ ] Multi-admin support with role-based access
- [ ] Data archival for very old records
- [ ] Cross-contract analytics queries

## License

See LICENSE file in repository root.
