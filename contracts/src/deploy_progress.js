const { execSync } = require('child_process');
const path = require('path');

const CONTRACT_PATH = path.join(__dirname, '../contracts');

function runCommand(command) {
  try {
    console.log(`Running: ${command}`);
    // Using stdio: 'pipe' to capture output if needed, but 'inherit' shows progress
    const output = execSync(command, { cwd: CONTRACT_PATH, encoding: 'utf-8' });
    return output;
  } catch (error) {
    console.error(`Error executing command: ${command}`);
    console.error(error.message);
    process.exit(1);
  }
}

async function deploy() {
  console.log('Building contracts...');
  runCommand('cargo build --release --target wasm32-unknown-unknown');

  console.log('Deploying CourseProgressContract...');
  // Assuming the wasm file is named after the package. 
  // Adjust 'aethermint_education.wasm' if the package name in Cargo.toml is different.
  const wasmPath = 'target/wasm32-unknown-unknown/release/aethermint_education.wasm';
  
  try {
    // Install WASM
    console.log('Installing WASM...');
    const installCmd = `soroban contract install --wasm ${wasmPath} --source alice --network standalone`;
    const wasmHash = runCommand(installCmd).trim();
    console.log(`WASM Hash: ${wasmHash}`);

    // Deploy Contract
    console.log('Instantiating contract...');
    const deployCmd = `soroban contract deploy --wasm-hash ${wasmHash} --source alice --network standalone`;
    const contractId = runCommand(deployCmd).trim();
    
    console.log(`\nSuccess! Contract deployed at: ${contractId}`);
  } catch (e) {
    console.error('Deployment failed. Ensure stellar-standalone is running and soroban-cli is installed.');
  }
}

deploy();