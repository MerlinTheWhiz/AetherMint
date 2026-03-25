# Event Logger Smart Contract

## Overview
The EventLoggerContract provides immutable audit trail functionality for the AetherMint education platform. It logs important events on-chain and maintains a complete history that can be queried and verified.

## Features

### Event Types
- **Course Completion** - Logs when users complete courses
- **Credential Issuance** - Logs when credentials are issued to users
- **User Achievement** - Logs when users earn achievements/badges
- **Profile Update** - Logs when user profiles are updated
- **Course Enrollment** - Logs when users enroll in courses

### Core Functionality
- **Immutable Logging** - All events are stored permanently on-chain
- **Query by User** - Retrieve all events for a specific user
- **Query by Type** - Filter events by event type
- **Recent Events** - Get latest events with pagination
- **Event Verification** - Verify authenticity of logged events
- **Audit Reports** - Generate comprehensive audit trails

## Smart Contract Implementation

### File Structure
```
contracts/src/
├── eventLogger.rs          # Main contract implementation
├── eventLogger_test.rs     # Comprehensive test suite
└── deploy_eventLogger.js   # Deployment script
```

### Key Components

#### Event Types
```rust
pub enum EventType {
    CourseCompletion,
    CredentialIssuance,
    UserAchievement,
    ProfileUpdate,
    CourseEnrollment,
}
```

#### Event Structure
```rust
pub struct EventLog {
    pub id: u64,
    pub event_type: EventType,
    pub user: Address,
    pub timestamp: u64,
    pub course_id: Option<String>,
    pub credential_id: Option<u64>,
    pub achievement_type: Option<String>,
    pub metadata: String, // JSON string for additional data
}
```

## API Endpoints

### Event Logging
- `POST /api/events/course-completion` - Log course completion
- `POST /api/events/credential-issuance` - Log credential issuance
- `POST /api/events/user-achievement` - Log user achievement
- `POST /api/events/profile-update` - Log profile update
- `POST /api/events/course-enrollment` - Log course enrollment

### Event Retrieval
- `GET /api/events/event/:eventId` - Get specific event by ID
- `GET /api/events/user/:userId/events` - Get all events for user
- `GET /api/events/type/:eventType` - Get events by type
- `GET /api/events/recent` - Get recent events
- `GET /api/events/count` - Get total event count
- `GET /api/events/search` - Search events with filters

### Verification
- `GET /api/events/verify/:eventId` - Verify event authenticity
- `GET /api/events/audit-report/:userId` - Generate user audit report

## Deployment

### Prerequisites
- Rust toolchain with wasm32 target
- Soroban CLI
- Stellar standalone network running

### Steps
1. Build the contract:
```bash
cd contracts
cargo build --release --target wasm32-unknown-unknown
```

2. Deploy using the deployment script:
```bash
node src/deploy_eventLogger.js
```

3. The script will:
   - Build the contract
   - Install the WASM on the network
   - Deploy the contract
   - Run basic tests to verify deployment

## Testing

### Run Contract Tests
```bash
cd contracts
cargo test eventLogger_test
```

### Test Coverage
- Contract initialization
- All event logging functions
- Event retrieval by ID
- Event retrieval by user
- Event retrieval by type
- Recent events with pagination
- Event verification
- Data persistence

## Integration with Backend

The backend service (`eventLoggerService.ts`) provides:
- TypeScript interface to the smart contract
- Event logging functions
- Query and search capabilities
- Audit report generation
- Event verification

### Usage Example
```typescript
// Log a course completion
const eventId = await eventLoggerService.logCourseCompletion(
  'user-address', 
  'course-101', 
  { grade: 'A+', duration: '40 hours' }
);

// Get user's audit report
const auditReport = await eventLoggerService.generateUserAuditReport('user-address');
```

## Security Considerations

- Events are immutable once logged
- Authentication required for sensitive operations
- Timestamps are blockchain-verified
- All data is stored on-chain for transparency
- Event verification ensures authenticity

## Performance

- Events are indexed by user and type for efficient querying
- Pagination support for large datasets
- Optimized storage patterns
- Reasonable gas costs for all operations

## Audit Trail Features

### Complete History
- Every user action is logged
- Timestamps are blockchain-verified
- Metadata supports rich event data
- Cross-referencing between related events

### Verification Capabilities
- Cryptographic proof of event authenticity
- Immutable timestamp verification
- User signature validation
- Cross-contract event correlation

### Reporting
- User activity timelines
- Course completion statistics
- Credential issuance tracking
- Achievement progression
- Enrollment patterns

## Future Enhancements

- Event aggregation and analytics
- Real-time event streaming
- Cross-contract event subscriptions
- Advanced filtering capabilities
- Integration with notification system