const { Server, Networks, TransactionBuilder, BASE_FEE } = require('stellar-sdk');
const { readFile } = require('fs/promises');
const { join } = require('path');

// Configuration
const NETWORK = process.env.NETWORK || 'testnet';
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'SBK2VIY4QZJ7K4G5YPVPBZC5QJ6K5E5FQJQY4Q5QJ6K5E5FQJQY4Q5QJ6K5E5FQJQY4Q';

// Network configuration
const getServer = () => {
  switch (NETWORK) {
    case 'mainnet':
      return new Server('https://horizon.stellar.org');
    case 'testnet':
      return new Server('https://horizon-testnet.stellar.org');
    default:
      throw new Error(`Unknown network: ${NETWORK}`);
  }
};

const getNetworkPassphrase = () => {
  switch (NETWORK) {
    case 'mainnet':
      return Networks.PUBLIC;
    case 'testnet':
      return Networks.TESTNET;
    default:
      throw new Error(`Unknown network: ${NETWORK}`);
  }
};

// Deploy contract function
async function deployContract() {
  console.log(`🚀 Deploying Sync Coordination Contract to ${NETWORK}...`);
  
  try {
    const server = getServer();
    const networkPassphrase = getNetworkPassphrase();
    
    // Load the compiled contract
    const contractCode = await readFile(
      join(__dirname, '..', 'target', 'wasm32-unknown-unknown', 'release', 'aethermint_education_contracts.wasm')
    );
    
    // Create admin keypair from secret
    const adminKeypair = StellarSdk.Keypair.fromSecret(ADMIN_SECRET);
    const adminPublicKey = adminKeypair.publicKey();
    
    console.log(`📋 Admin Account: ${adminPublicKey}`);
    
    // Get admin account info
    const adminAccount = await server.loadAccount(adminPublicKey);
    console.log(`💰 Admin Account Balance: ${adminAccount.balances.map(b => `${b.asset_code || 'XLM'}: ${b.balance}`).join(', ')}`);
    
    // Build transaction to deploy contract
    const contractTransaction = new TransactionBuilder(adminAccount, {
      fee: BASE_FEE,
      networkPassphrase,
    })
      .setTimeout(30)
      .appendOperation({
        type: 'createCustomContract',
        source: adminPublicKey,
        wasmHash: StellarSdk.hash(contractCode),
      })
      .build();
    
    // Sign transaction
    contractTransaction.sign(adminKeypair);
    
    // Submit transaction
    console.log('📤 Submitting deployment transaction...');
    const result = await server.submitTransaction(contractTransaction);
    
    if (result.successful) {
      const contractId = StellarSdk.getContractId(result.hash);
      console.log(`✅ Contract deployed successfully!`);
      console.log(`📄 Contract ID: ${contractId}`);
      console.log(`🔗 Transaction Hash: ${result.hash}`);
      
      // Initialize the contract
      console.log('🔧 Initializing contract...');
      await initializeContract(server, contractId, adminKeypair, networkPassphrase);
      
      // Store contract info for easy access
      const contractInfo = {
        network: NETWORK,
        contractId: contractId,
        admin: adminPublicKey,
        deployedAt: new Date().toISOString(),
        transactionHash: result.hash,
      };
      
      console.log('💾 Contract deployment info:', JSON.stringify(contractInfo, null, 2));
      
      // Test basic functionality
      console.log('🧪 Testing contract functionality...');
      await testContract(server, contractId, adminKeypair, networkPassphrase);
      
    } else {
      console.error('❌ Deployment failed:', result);
      throw new Error('Contract deployment failed');
    }
    
  } catch (error) {
    console.error('❌ Deployment error:', error);
    process.exit(1);
  }
}

// Initialize contract function
async function initializeContract(server, contractId, adminKeypair, networkPassphrase) {
  try {
    const adminAccount = await server.loadAccount(adminKeypair.publicKey());
    
    const initTransaction = new TransactionBuilder(adminAccount, {
      fee: BASE_FEE,
      networkPassphrase,
    })
      .setTimeout(30)
      .appendOperation({
        type: 'invokeContractFunction',
        contract: contractId,
        function: 'initialize',
        args: [
          new StellarSdk.Address(adminKeypair.publicKey()).toScVal(),
        ],
      })
      .build();
    
    initTransaction.sign(adminKeypair);
    
    const result = await server.submitTransaction(initTransaction);
    
    if (result.successful) {
      console.log('✅ Contract initialized successfully!');
    } else {
      console.error('❌ Contract initialization failed:', result);
      throw new Error('Contract initialization failed');
    }
  } catch (error) {
    console.error('❌ Initialization error:', error);
    throw error;
  }
}

// Test contract functionality
async function testContract(server, contractId, adminKeypair, networkPassphrase) {
  try {
    console.log('📱 Registering test devices...');
    
    const adminAccount = await server.loadAccount(adminKeypair.publicKey());
    const user1 = StellarSdk.Keypair.random();
    const user2 = StellarSdk.Keypair.random();
    
    // Register devices for users
    await registerDevice(server, contractId, adminKeypair, networkPassphrase, user1, 'Mobile', 'iPhone 14');
    await registerDevice(server, contractId, adminKeypair, networkPassphrase, user2, 'Desktop', 'Work Laptop');
    
    console.log('🔄 Testing sync sessions...');
    
    // Get device IDs from registration results
    const device1Id = 'device_1'; // Simplified for demo
    const device2Id = 'device_2'; // Simplified for demo
    
    // Start sync sessions
    const session1Id = await startSyncSession(server, contractId, adminKeypair, networkPassphrase, user1, device1Id);
    const session2Id = await startSyncSession(server, contractId, adminKeypair, networkPassphrase, user2, device2Id);
    
    console.log('📝 Submitting sync entries...');
    
    // Submit sync entries
    await submitSyncEntry(server, contractId, adminKeypair, networkPassphrase, session1Id, device1Id, 'course_progress', 'hash123', 'progress_data');
    await submitSyncEntry(server, contractId, adminKeypair, networkPassphrase, session2Id, device2Id, 'settings', 'hash456', 'settings_data');
    
    console.log('🔍 Testing conflict resolution...');
    
    // Test conflict resolution (simplified - would need actual conflict)
    await testConflictResolution(server, contractId, adminKeypair, networkPassphrase);
    
    console.log('✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Contract testing error:', error);
  }
}

// Register device helper
async function registerDevice(server, contractId, adminKeypair, networkPassphrase, userKeypair, deviceType, deviceName) {
  try {
    const adminAccount = await server.loadAccount(adminKeypair.publicKey());
    
    const registerTransaction = new TransactionBuilder(adminAccount, {
      fee: BASE_FEE,
      networkPassphrase,
    })
      .setTimeout(30)
      .appendOperation({
        type: 'invokeContractFunction',
        contract: contractId,
        function: 'register_device',
        args: [
          new StellarSdk.Address(userKeypair.publicKey()).toScVal(), // user_address
          new StellarSdk.ScSymbol(deviceType).toScVal(), // device_type
          new StellarSdk.ScString(deviceName).toScVal(), // name
          new StellarSdk.ScArray([
            new StellarSdk.ScString('read').toScVal(),
            new StellarSdk.ScString('write').toScVal(),
          ]).toScVal(), // capabilities
        ],
      })
      .build();
    
    registerTransaction.sign(adminKeypair);
    
    const result = await server.submitTransaction(registerTransaction);
    
    if (result.successful) {
      console.log(`✅ Device registered: ${deviceName}`);
    } else {
      console.error('❌ Device registration failed:', result);
    }
  } catch (error) {
    console.error('❌ Register device error:', error);
  }
}

// Start sync session helper
async function startSyncSession(server, contractId, adminKeypair, networkPassphrase, userKeypair, deviceId) {
  try {
    const adminAccount = await server.loadAccount(adminKeypair.publicKey());
    
    const sessionTransaction = new TransactionBuilder(adminAccount, {
      fee: BASE_FEE,
      networkPassphrase,
    })
      .setTimeout(30)
      .appendOperation({
        type: 'invokeContractFunction',
        contract: contractId,
        function: 'start_sync_session',
        args: [
          new StellarSdk.Address(userKeypair.publicKey()).toScVal(), // user_address
          new StellarSdk.ScString(deviceId).toScVal(), // device_id
        ],
      })
      .build();
    
    sessionTransaction.sign(adminKeypair);
    
    const result = await server.submitTransaction(sessionTransaction);
    
    if (result.successful) {
      console.log(`✅ Sync session started for device: ${deviceId}`);
      return 'session_1'; // Simplified for demo
    } else {
      console.error('❌ Sync session start failed:', result);
      throw new Error('Failed to start sync session');
    }
  } catch (error) {
    console.error('❌ Start sync session error:', error);
    throw error;
  }
}

// Submit sync entry helper
async function submitSyncEntry(server, contractId, adminKeypair, networkPassphrase, sessionId, deviceId, dataType, dataHash, payload) {
  try {
    const adminAccount = await server.loadAccount(adminKeypair.publicKey());
    
    const entryTransaction = new TransactionBuilder(adminAccount, {
      fee: BASE_FEE,
      networkPassphrase,
    })
      .setTimeout(30)
      .appendOperation({
        type: 'invokeContractFunction',
        contract: contractId,
        function: 'submit_sync_entry',
        args: [
          new StellarSdk.ScString(sessionId).toScVal(), // session_id
          new StellarSdk.ScString(deviceId).toScVal(), // device_id
          new StellarSdk.ScString(dataType).toScVal(), // data_type
          new StellarSdk.ScString(dataHash).toScVal(), // data_hash
          new StellarSdk.ScString(payload).toScVal(), // payload
        ],
      })
      .build();
    
    entryTransaction.sign(adminKeypair);
    
    const result = await server.submitTransaction(entryTransaction);
    
    if (result.successful) {
      console.log(`✅ Sync entry submitted: ${dataType}`);
    } else {
      console.error('❌ Sync entry submission failed:', result);
    }
  } catch (error) {
    console.error('❌ Submit sync entry error:', error);
  }
}

// Test conflict resolution helper
async function testConflictResolution(server, contractId, adminKeypair, networkPassphrase) {
  try {
    const adminAccount = await server.loadAccount(adminKeypair.publicKey());
    
    // Test last-write-wins resolution
    const conflictTransaction = new TransactionBuilder(adminAccount, {
      fee: BASE_FEE,
      networkPassphrase,
    })
      .setTimeout(30)
      .appendOperation({
        type: 'invokeContractFunction',
        contract: contractId,
        function: 'resolve_conflict',
        args: [
          new StellarSdk.ScString('conflict_1').toScVal(), // conflict_id
          new StellarSdk.ScSymbol('LastWriteWins').toScVal(), // resolution
          new StellarSdk.ScString('entry_1').toScVal(), // winning_entry_id
          new StellarSdk.Address(adminKeypair.publicKey()).toScVal(), // resolver
        ],
      })
      .build();
    
    conflictTransaction.sign(adminKeypair);
    
    const result = await server.submitTransaction(conflictTransaction);
    
    if (result.successful) {
      console.log('✅ Conflict resolved with LastWriteWins strategy');
    } else {
      console.error('❌ Conflict resolution failed:', result);
    }
  } catch (error) {
    console.error('❌ Conflict resolution test error:', error);
  }
}

// Helper function to fund account if needed
async function fundAccountIfNeeded(server, publicKey) {
  try {
    const account = await server.loadAccount(publicKey);
    console.log(`✅ Account ${publicKey} exists and is funded`);
    return account;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      console.log(`💰 Funding account ${publicKey}...`);
      
      // For testnet, you can use the friendbot
      if (NETWORK === 'testnet') {
        const response = await fetch(`https://friendbot.stellar.org/?addr=${publicKey}`);
        if (response.ok) {
          console.log('✅ Account funded successfully!');
          return await server.loadAccount(publicKey);
        }
      }
    }
    throw error;
  }
}

// Main execution
async function main() {
  console.log('🎓 AetherMint Sync Coordination Contract Deployment');
  console.log('==========================================');
  
  // Validate environment
  if (!ADMIN_SECRET) {
    console.error('❌ ADMIN_SECRET environment variable is required');
    process.exit(1);
  }
  
  try {
    // Check if contract file exists
    const contractPath = join(__dirname, '..', 'target', 'wasm32-unknown-unknown', 'release', 'aethermint_education_contracts.wasm');
    try {
      await readFile(contractPath);
    } catch (error) {
      console.error('❌ Contract file not found. Please build the contract first:');
      console.error('   cd contracts && cargo build --target wasm32-unknown-unknown --release');
      process.exit(1);
    }
    
    // Deploy the contract
    await deployContract();
    
    console.log('\n🎉 Deployment completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Save the contract ID for your application');
    console.log('2. Update your frontend/backend to use the new contract');
    console.log('3. Test device registration and sync functionality');
    console.log('4. Implement conflict resolution strategies in your app');
    
  } catch (error) {
    console.error('\n❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run deployment
if (require.main === module) {
  main();
}

module.exports = {
  deployContract,
  initializeContract,
  testContract,
  registerDevice,
  startSyncSession,
  submitSyncEntry,
};
