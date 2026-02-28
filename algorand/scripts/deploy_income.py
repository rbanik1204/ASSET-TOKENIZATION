"""
Deploy Income Distribution Smart Contract
"""

import sys
import os
import argparse
import json
import subprocess
from algosdk.v2client import algod
from algosdk import account, mnemonic, transaction
from algosdk.transaction import ApplicationCreateTxn, StateSchema, OnComplete


def get_algod_client(network: str):
    """Get Algorand client for specified network"""
    if network == 'testnet':
        algod_address = "https://testnet-api.algonode.cloud"
        algod_token = ""
    else:  # mainnet
        algod_address = "https://mainnet-api.algonode.cloud"
        algod_token = ""
    
    return algod.AlgodClient(algod_token, algod_address)


def compile_program(client: algod.AlgodClient, source_code: str):
    """Compile TEAL source code"""
    compile_response = client.compile(source_code)
    return bytes.fromhex(compile_response['result'])


def deploy_contract(network: str, creator_mnemonic: str, asa_id: int):
    """Deploy income distribution contract"""
    try:
        # Initialize Algorand client
        algod_client = get_algod_client(network)
        
        # Get creator account
        creator_private_key = mnemonic.to_private_key(creator_mnemonic)
        creator_address = account.address_from_private_key(creator_private_key)
        
        print(f"Deploying from account: {creator_address}")
        print(f"For ASA ID: {asa_id}")
        
        # Get current directory
        current_dir = os.path.dirname(os.path.abspath(__file__))
        contract_path = os.path.join(current_dir, '..', 'contracts', 'income_distribution.py')
        
        # Compile PyTeal to TEAL for approval program
        print("Compiling approval program...")
        approval_result = subprocess.run(
            ['python', contract_path, 'approval'],
            capture_output=True,
            text=True
        )
        
        if approval_result.returncode != 0:
            raise Exception(f"Failed to compile approval program: {approval_result.stderr}")
        
        approval_teal = approval_result.stdout
        
        # Compile PyTeal to TEAL for clear program
        print("Compiling clear program...")
        clear_result = subprocess.run(
            ['python', contract_path, 'clear'],
            capture_output=True,
            text=True
        )
        
        if clear_result.returncode != 0:
            raise Exception(f"Failed to compile clear program: {clear_result.stderr}")
        
        clear_teal = clear_result.stdout
        
        # Compile TEAL to bytecode
        print("Compiling TEAL to bytecode...")
        approval_program = compile_program(algod_client, approval_teal)
        clear_program = compile_program(algod_client, clear_teal)
        
        # Define state schema
        # Global: admin (bytes), asa_id (uint), total_deposited (uint), total_claimed (uint), paused (uint)
        global_schema = StateSchema(num_uints=4, num_byte_slices=1)
        local_schema = StateSchema(num_uints=0, num_byte_slices=0)
        
        # Get suggested params
        params = algod_client.suggested_params()
        
        # Create application
        print("Creating application transaction...")
        txn = ApplicationCreateTxn(
            sender=creator_address,
            sp=params,
            on_complete=OnComplete.NoOpOC,
            approval_program=approval_program,
            clear_program=clear_program,
            global_schema=global_schema,
            local_schema=local_schema,
            app_args=[asa_id.to_bytes(8, 'big')],  # Pass ASA ID
            extra_pages=3,  # For box storage
        )
        
        # Sign transaction
        signed_txn = txn.sign(creator_private_key)
        
        # Send transaction
        print("Sending transaction...")
        tx_id = algod_client.send_transaction(signed_txn)
        print(f"Transaction ID: {tx_id}")
        
        # Wait for confirmation
        print("Waiting for confirmation...")
        confirmed_txn = transaction.wait_for_confirmation(algod_client, tx_id, 4)
        
        # Get application ID
        app_id = confirmed_txn['application-index']
        print(f"Application ID: {app_id}")
        
        # Get application address
        app_address = algod.logic.get_application_address(app_id)
        print(f"Application Address: {app_address}")
        
        # Generate explorer URL
        explorer_base = "https://testnet.algoexplorer.io" if network == 'testnet' else "https://algoexplorer.io"
        explorer_url = f"{explorer_base}/application/{app_id}"
        
        result = {
            "success": True,
            "appId": app_id,
            "appAddress": app_address,
            "txId": tx_id,
            "asaId": asa_id,
            "network": network,
            "creator": creator_address,
            "explorerUrl": explorer_url,
            "confirmedRound": confirmed_txn['confirmed-round']
        }
        
        print(json.dumps(result, indent=2))
        return result
        
    except Exception as e:
        error_result = {
            "success": False,
            "error": str(e)
        }
        print(json.dumps(error_result, indent=2))
        return error_result


def main():
    parser = argparse.ArgumentParser(description='Deploy Income Distribution Smart Contract')
    parser.add_argument('--network', choices=['testnet', 'mainnet'], required=True,
                        help='Network to deploy to')
    parser.add_argument('--creator-mnemonic', required=True,
                        help='25-word mnemonic of contract creator')
    parser.add_argument('--asa-id', type=int, required=True,
                        help='ASA ID for income distribution')
    
    args = parser.parse_args()
    
    deploy_contract(args.network, args.creator_mnemonic, args.asa_id)


if __name__ == "__main__":
    main()
