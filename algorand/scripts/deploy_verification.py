#!/usr/bin/env python3
"""
deploy_verification.py

Deploy the Asset Verification smart contract to Algorand
"""

import sys
import json
import argparse
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent))

from utils.algorand_sdk import AlgorandClient
from algosdk.transaction import StateSchema, ApplicationCreateTxn, OnComplete
from algosdk import mnemonic as mn
import subprocess


def compile_program(program_path: str, mode: str) -> bytes:
    """Compile PyTeal program to TEAL"""
    result = subprocess.run(
        ['python', program_path, mode],
        capture_output=True,
        text=True
    )
    
    if result.returncode != 0:
        raise Exception(f"Compilation failed: {result.stderr}")
    
    teal_code = result.stdout
    return teal_code.encode()


def main():
    parser = argparse.ArgumentParser(description='Deploy Asset Verification Contract')
    parser.add_argument('--network', choices=['testnet', 'mainnet'], default='testnet')
    parser.add_argument('--creator-mnemonic', required=True, help='Creator wallet mnemonic')
    
    args = parser.parse_args()
    
    try:
        # Initialize client
        client = AlgorandClient(network=args.network)
        
        # Compile programs
        print('📝 Compiling PyTeal programs...')
        contract_path = Path(__file__).parent.parent / 'contracts' / 'asset_verification.py'
        
        approval_teal = compile_program(str(contract_path), 'approval')
        clear_teal = compile_program(str(contract_path), 'clear')
        
        # Compile TEAL to bytecode
        print('🔨 Compiling TEAL to bytecode...')
        approval_program = client.algod_client.compile(approval_teal.decode())
        clear_program = client.algod_client.compile(clear_teal.decode())
        
        approval_bytes = bytes.fromhex(approval_program['hash'])
        clear_bytes = bytes.fromhex(clear_program['hash'])
        
        # Define state schema
        # Global: admin, total_verified, total_rejected, paused
        global_schema = StateSchema(
            num_uints=3,  # total_verified, total_rejected, paused
            num_byte_slices=1  # admin address
        )
        
        # Local: None needed
        local_schema = StateSchema(num_uints=0, num_byte_slices=0)
        
        # Convert mnemonic to private key
        private_key = mn.to_private_key(args.creator_mnemonic)
        from algosdk import account
        creator_address = account.address_from_private_key(private_key)
        
        # Get suggested params
        params = client.algod_client.suggested_params()
        
        # Create application
        print('🚀 Deploying verification contract...')
        txn = ApplicationCreateTxn(
            sender=creator_address,
            sp=params,
            on_complete=OnComplete.NoOpOC,
            approval_program=approval_bytes,
            clear_program=clear_bytes,
            global_schema=global_schema,
            local_schema=local_schema,
            extra_pages=3  # Allow box storage
        )
        
        # Sign and send
        signed_txn = txn.sign(private_key)
        tx_id = client.algod_client.send_transaction(signed_txn)
        
        print(f'⏳ Transaction sent: {tx_id}')
        print('Waiting for confirmation...')
        
        # Wait for confirmation
        confirmed = client._wait_for_confirmation(tx_id)
        
        # Get application ID
        app_id = confirmed['application-index']
        
        result = {
            'success': True,
            'appId': app_id,
            'txId': tx_id,
            'network': args.network,
            'creator': creator_address,
            'explorerUrl': f'https://{"testnet." if args.network == "testnet" else ""}algoexplorer.io/application/{app_id}'
        }
        
        print(json.dumps(result, indent=2))
        print(f'\n✅ Verification contract deployed!')
        print(f'App ID: {app_id}')
        print(f'Explorer: {result["explorerUrl"]}')
        
        sys.exit(0)
        
    except Exception as e:
        error_result = {
            'success': False,
            'error': str(e),
            'type': type(e).__name__
        }
        print(json.dumps(error_result, indent=2))
        sys.exit(1)


if __name__ == '__main__':
    main()
