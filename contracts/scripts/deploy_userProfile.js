const {
    ContractFunctionArgs,
    Contract,
    Server,
    Keypair,
    TransactionBuilder,
    Networks,
    SorobanRpc
} = require('@stellar/stellar-sdk');
const fs = require('fs');

async function deployUserProfileContract() {
    // Configuration - adjust these values as needed
    const rpcUrl = 'https://rpc-futurenet.stellar.org:443';
    const networkPassphrase = Networks.FUTURENET; // Use Networks.TESTNET for testnet
    
    // Initialize the server
    const server = new Server(rpcUrl);
    
    // Generate a keypair for testing (replace with your actual account in production)
    const sourceKeypair = Keypair.generate();
    console.log('Generated keypair for testing. Public Key:', sourceKeypair.publicKey());
    
    // In a real scenario, you'd load your funded account
    // For Futurenet, we can fund the account using friendbot
    try {
        await fetch(`https://friendbot-futurenet.stellar.org/?addr=${encodeURIComponent(sourceKeypair.publicKey())}`);
        console.log('Account funded from friendbot');
    } catch (e) {
        console.log('Account funding may have failed or is not needed');
    }
    
    // Load the compiled contract WASM file
    // Make sure to build the contract first: soroban contract build
    const wasmBytes = fs.readFileSync('./target/wasm32-unknown-unknown/release/aethermint_education_contracts.wasm');
    
    // Get the account from the server
    let sourceAccount;
    try {
        sourceAccount = await server.getAccount(sourceKeypair.publicKey());
    } catch (error) {
        throw new Error(`Account does not exist on the network: ${error}`);
    }
    
    // Create a transaction to upload the contract code
    const contractUploadTx = new TransactionBuilder(sourceAccount, {
        fee: '100',
        networkPassphrase: networkPassphrase
    })
    .addOperation(
        SorobanRpc.xdr.makeUploadContractWasmOperation({ wasm: wasmBytes })
    )
    .setTimeout(30)
    .build();
    
    // Sign the transaction
    contractUploadTx.sign(sourceKeypair);
    
    // Simulate the transaction to get the footprint and other details
    let simulationResponse;
    try {
        simulationResponse = await server.simulateTransaction(contractUploadTx);
        console.log('Simulation successful:', simulationResponse);
    } catch (error) {
        throw new Error(`Simulation failed: ${error}`);
    }
    
    // If simulation was successful, prepare the final transaction
    const preparedTransaction = SorobanRpc.assembleTransaction(
        contractUploadTx,
        simulationResponse
    ).build();
    
    // Sign the prepared transaction
    preparedTransaction.sign(sourceKeypair);
    
    // Submit the transaction
    let result;
    try {
        result = await server.sendTransaction(preparedTransaction);
        console.log('Contract uploaded successfully!');
        console.log('Transaction hash:', result.hash);
    } catch (error) {
        throw new Error(`Transaction submission failed: ${error}`);
    }
    
    if (result.successful) {
        // Extract the contract WASM ID from the result
        const wasmId = result.returnValue();
        console.log('WASM ID:', wasmId.toString());
        
        // Now instantiate the contract
        const instantiateTx = new TransactionBuilder(sourceAccount, {
            fee: '100',
            networkPassphrase: networkPassphrase
        })
        .addOperation(
            SorobanRpc.xdr.makeCreateContractOperation({
                wasmId: wasmId,
                salt: Buffer.from('user-profile-contract', 'utf8') // Unique salt for this instance
            })
        )
        .setTimeout(30)
        .build();
        
        instantiateTx.sign(sourceKeypair);
        
        // Simulate instantiation
        const instantiateSimulation = await server.simulateTransaction(instantiateTx);
        console.log('Instantiation simulation successful:', instantiateSimulation);
        
        // Prepare and sign the instantiation transaction
        const preparedInstantiateTx = SorobanRpc.assembleTransaction(
            instantiateTx,
            instantiateSimulation
        ).build();
        
        preparedInstantiateTx.sign(sourceKeypair);
        
        // Submit instantiation
        const instantiateResult = await server.sendTransaction(preparedInstantiateTx);
        
        if (instantiateResult.successful) {
            const contractId = instantiateResult.returnValue();
            console.log('UserProfile Contract deployed successfully!');
            console.log('Contract ID:', contractId.toString());
            
            return {
                contractId: contractId.toString(),
                wasmId: wasmId.toString()
            };
        } else {
            throw new Error(`Contract instantiation failed: ${instantiateResult.resultXdr()}`);
        }
    } else {
        throw new Error(`Contract upload failed: ${result.resultXdr()}`);
    }
}

// Alternative CLI-based deployment instructions
function showCLIDeploymentInstructions() {
    console.log('\n=== CLI-Based Deployment Instructions ===');
    console.log('If you prefer using the Soroban CLI, follow these steps:');
    console.log('');
    console.log('1. Build the contract:');
    console.log('   cd contracts');
    console.log('   soroban contract build');
    console.log('');
    console.log('2. Deploy the WASM:');
    console.log('   soroban contract deploy --wasm-path=target/wasm32-unknown-unknown/release/aethermint_education_contracts.wasm --source=default --network=futurenet');
    console.log('');
    console.log('3. Initialize the contract (if needed):');
    console.log('   soroban contract invoke --id=<CONTRACT_ID> --source=default --network=futurenet -- initialize');
    console.log('');
}

// Main execution
async function main() {
    console.log('UserProfile Contract Deployment Script');
    console.log('======================================');
    
    try {
        // Attempt deployment (this is a simplified example)
        // In practice, you may want to use the CLI approach shown in the helper function
        const result = await deployUserProfileContract();
        console.log('\nDeployment completed successfully!');
        console.log('Contract ID:', result.contractId);
        console.log('WASM ID:', result.wasmId);
    } catch (error) {
        console.error('\nDeployment failed:', error.message);
        console.log('\nNote: Make sure you have:');
        console.log('- Built the contract with: soroban contract build');
        console.log('- Set up your Stellar account with sufficient funds');
        console.log('- Updated the network settings if not using Futurenet');
        showCLIDeploymentInstructions();
    }
}

// Execute if run directly
if (require.main === module) {
    main();
}

module.exports = {
    deployUserProfileContract,
    showCLIDeploymentInstructions
};