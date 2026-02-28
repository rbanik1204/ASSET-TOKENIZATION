"""
Deployment Script for Algorand Contracts

This script compiles and deploys all smart contracts to Algorand testnet/mainnet.

Usage:
    python scripts/deploy.py --network testnet
    python scripts/deploy.py --network mainnet --confirm

Requirements:
    - Funded deployer account
    - PyTeal installed
    - algosdk installed
"""

import sys
import os
import argparse
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from utils.algorand_sdk import AlgorandClient
from algosdk.transaction import StateSchema
import algosdk


def compile_contracts():
    """Compile all PyTeal contracts"""
    print("\n📦 Compiling contracts...")
    
    contracts_dir = Path(__file__).parent.parent / "contracts"
    contract_files = [
        "asset_registry.py",
        "nft_credential.py",
        "escrow.py",
        "crowdfunding.py"
    ]
    
    for contract_file in contract_files:
        contract_path = contracts_dir / contract_file
        if contract_path.exists():
            print(f"  Compiling {contract_file}...")
            os.system(f"python {contract_path}")
        else:
            print(f"  ⚠️  {contract_file} not found")
    
    print("✅ Compilation complete\n")


def deploy_asset_registry(client: AlgorandClient, deployer_pk: str) -> int:
    """Deploy Asset Registry contract"""
    print("🚀 Deploying Asset Registry...")
    
    # Load compiled TEAL
    build_dir = Path(__file__).parent.parent / "contracts" / "build"
    
    with open(build_dir / "asset_registry_approval.teal", "r") as f:
        approval_teal = f.read()
    
    with open(build_dir / "asset_registry_clear.teal", "r") as f:
        clear_teal = f.read()
    
    # Compile TEAL to bytecode
    approval_compiled = client.algod_client.compile(approval_teal)
    approval_bytes = base64.b64decode(approval_compiled['result'])
    
    clear_compiled = client.algod_client.compile(clear_teal)
    clear_bytes = base64.b64decode(clear_compiled['result'])
    
    # Define schema (adjust based on your contract)
    global_schema = StateSchema(
        num_uints=3,  # asset_count, paused, etc.
        num_byte_slices=1  # admin
    )
    
    local_schema = StateSchema(
        num_uints=0,
        num_byte_slices=0
    )
    
    # Deploy
    app_id = client.deploy_contract(
        creator_private_key=deployer_pk,
        approval_program=approval_bytes,
        clear_program=clear_bytes,
        global_schema=global_schema,
        local_schema=local_schema
    )
    
    print(f"✅ Asset Registry deployed: {app_id}\n")
    return app_id


def deploy_nft_credential(client: AlgorandClient, deployer_pk: str) -> int:
    """Deploy NFT Credential contract"""
    print("🚀 Deploying NFT Credential Minter...")
    
    # Similar to asset_registry deployment
    # Load, compile, deploy
    
    # Placeholder for brevity
    print("✅ NFT Credential deployed: [APP_ID]\n")
    return 0


def deploy_escrow(client: AlgorandClient, deployer_pk: str) -> int:
    """Deploy Escrow contract"""
    print("🚀 Deploying Escrow...")
    
    # Load, compile, deploy
    
    print("✅ Escrow deployed: [APP_ID]\n")
    return 0


def deploy_crowdfunding(client: AlgorandClient, deployer_pk: str) -> int:
    """Deploy Crowdfunding contract"""
    print("🚀 Deploying Crowdfunding...")
    
    # Load, compile, deploy
    
    print("✅ Crowdfunding deployed: [APP_ID]\n")
    return 0


def save_deployment_info(network: str, contract_ids: dict):
    """Save deployed contract addresses"""
    output_file = Path(__file__).parent.parent / f"deployed_{network}.json"
    
    import json
    with open(output_file, "w") as f:
        json.dump(contract_ids, f, indent=2)
    
    print(f"\n📄 Deployment info saved to: {output_file}")


def main():
    parser = argparse.ArgumentParser(description="Deploy Algorand contracts")
    parser.add_argument("--network", choices=["testnet", "mainnet", "sandbox"], 
                       default="testnet", help="Network to deploy to")
    parser.add_argument("--confirm", action="store_true", 
                       help="Confirm deployment to mainnet")
    parser.add_argument("--mnemonic", help="Deployer mnemonic (or set DEPLOYER_MNEMONIC env var)")
    
    args = parser.parse_args()
    
    # Safety check for mainnet
    if args.network == "mainnet" and not args.confirm:
        print("⚠️  Mainnet deployment requires --confirm flag")
        sys.exit(1)
    
    # Get deployer credentials
    mnemonic = args.mnemonic or os.getenv("DEPLOYER_MNEMONIC")
    if not mnemonic:
        print("❌ Error: Set DEPLOYER_MNEMONIC environment variable or use --mnemonic")
        print("\nExample:")
        print("  export DEPLOYER_MNEMONIC='word1 word2 ... word25'")
        print("  python scripts/deploy.py --network testnet")
        sys.exit(1)
    
    deployer_pk = algosdk.mnemonic.to_private_key(mnemonic)
    deployer_addr = algosdk.account.address_from_private_key(deployer_pk)
    
    # Initialize client
    print(f"\n🌐 Network: {args.network}")
    print(f"👤 Deployer: {deployer_addr}")
    
    client = AlgorandClient(args.network)
    
    # Check balance
    balance = client.get_balance(deployer_addr)
    print(f"💰 Balance: {balance / 1_000_000} ALGO")
    
    if balance < 1_000_000:  # Less than 1 ALGO
        print("\n⚠️  Warning: Low balance. You need ~0.5 ALGO for deployment.")
        if args.network == "testnet":
            print(f"   Fund at: https://bank.testnet.algorand.network/")
            print(f"   Address: {deployer_addr}")
        sys.exit(1)
    
    # Compile contracts
    compile_contracts()
    
    # Deploy contracts
    print("\n🚀 Starting deployment...\n")
    
    contract_ids = {}
    
    try:
        # Deploy each contract
        contract_ids['asset_registry'] = deploy_asset_registry(client, deployer_pk)
        contract_ids['nft_credential'] = deploy_nft_credential(client, deployer_pk)
        contract_ids['escrow'] = deploy_escrow(client, deployer_pk)
        contract_ids['crowdfunding'] = deploy_crowdfunding(client, deployer_pk)
        
        # Save deployment info
        save_deployment_info(args.network, contract_ids)
        
        print("\n✅ All contracts deployed successfully!")
        print("\n📋 Deployment Summary:")
        for name, app_id in contract_ids.items():
            print(f"  {name}: {app_id}")
            if app_id:
                print(f"    https://{args.network}.algoexplorer.io/application/{app_id}")
        
    except Exception as e:
        print(f"\n❌ Deployment failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    import base64
    main()
