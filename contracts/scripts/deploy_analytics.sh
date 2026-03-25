#!/bin/bash

# Analytics Storage Contract Deployment Script
# Deploys and initializes the analytics storage smart contract

set -e

echo "=== Analytics Storage Contract Deployment ==="
echo ""

# Check for required environment variables
if [ -z "$ADMIN_SECRET_KEY" ]; then
    echo "Error: ADMIN_SECRET_KEY environment variable not set"
    exit 1
fi

# Configuration
NETWORK="${NETWORK:-testnet}"
BUILD_DIR="target/wasm32-unknown-unknown/release"
CONTRACT_NAME="analytics_storage"
WASM_FILE="$BUILD_DIR/${CONTRACT_NAME}.wasm"

echo "Network: $NETWORK"
echo "Contract: $CONTRACT_NAME"
echo ""

# Step 1: Build the contract
echo "Step 1: Building contract..."
cd "$(dirname "$0")/.."
cargo build --target wasm32-unknown-unknown --release --package analytics_storage

if [ ! -f "$WASM_FILE" ]; then
    echo "Error: WASM file not found at $WASM_FILE"
    exit 1
fi

echo "✓ Contract built successfully"
echo ""

# Step 2: Optimize WASM (optional but recommended)
if command -v wasm-opt &> /dev/null; then
    echo "Step 2: Optimizing WASM..."
    wasm-opt -Oz "$WASM_FILE" -o "${WASM_FILE}.opt"
    mv "${WASM_FILE}.opt" "$WASM_FILE"
    echo "✓ WASM optimized"
else
    echo "Step 2: Skipping optimization (wasm-opt not found)"
fi
echo ""

# Step 3: Deploy contract
echo "Step 3: Deploying contract to $NETWORK..."
CONTRACT_ID=$(stellar contract deploy \
    --wasm "$WASM_FILE" \
    --source "$ADMIN_SECRET_KEY" \
    --network "$NETWORK" \
    2>&1 | tail -n 1)

if [ -z "$CONTRACT_ID" ]; then
    echo "Error: Failed to deploy contract"
    exit 1
fi

echo "✓ Contract deployed"
echo "Contract ID: $CONTRACT_ID"
echo ""

# Step 4: Get admin public key
echo "Step 4: Deriving admin address..."
ADMIN_PUBLIC_KEY=$(stellar keys address admin 2>/dev/null || echo "")

if [ -z "$ADMIN_PUBLIC_KEY" ]; then
    echo "Warning: Could not derive admin public key from 'admin' identity"
    echo "Please initialize the contract manually with:"
    echo "  stellar contract invoke --id $CONTRACT_ID --source \$ADMIN_SECRET_KEY --network $NETWORK -- initialize --admin YOUR_PUBLIC_KEY"
else
    echo "Admin address: $ADMIN_PUBLIC_KEY"
    echo ""
    
    # Step 5: Initialize contract
    echo "Step 5: Initializing contract..."
    stellar contract invoke \
        --id "$CONTRACT_ID" \
        --source "$ADMIN_SECRET_KEY" \
        --network "$NETWORK" \
        -- initialize \
        --admin "$ADMIN_PUBLIC_KEY"
    
    echo "✓ Contract initialized"
fi

echo ""
echo "=== Deployment Complete ==="
echo ""
echo "Contract ID: $CONTRACT_ID"
echo "Network: $NETWORK"
echo ""
echo "Add to your .env file:"
echo "ANALYTICS_CONTRACT_ID=$CONTRACT_ID"
echo ""
echo "Next steps:"
echo "1. Update .env with the contract ID"
echo "2. Run the update script: node contracts/src/update_analytics.js"
echo "3. Set up a cron job for automated updates"
echo ""
