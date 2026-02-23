const { Server, Keypair, TransactionBuilder, Operation, Asset, Networks } = require('stellar-sdk');
const { Contract, SorobanRpc } = require('soroban-client');

async function deployCredentials() {
  const server = new Server('https://soroban-testnet.stellar.org');
  const adminKeypair = Keypair.fromSecret('YOUR_ADMIN_SECRET_KEY_HERE'); // ← replace!

  // Load account
  const account = await server.loadAccount(adminKeypair.publicKey());

  // Deploy contract (use stellar-cli in real workflow, this is example)
  console.log("Deploying credentials contract...");

  // In real deployment, use:
  // stellar contract deploy --wasm target/wasm32-unknown-unknown/release/aethermint_education_contracts.wasm --source <source-account>

  console.log("Contract deployed. Update contract ID in frontend/config.");
}

deployCredentials().catch(console.error);