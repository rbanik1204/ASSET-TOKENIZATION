#!/usr/bin/env python3
"""
verify_asset.py

Call the verification contract to verify or reject an asset
"""

import sys
import json
import argparse
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent))

from utils.algorand_sdk import AlgorandClient
from algosdk.transaction import ApplicationCallTxn, OnComplete
from algosdk import mnemonic as mn
from algosdk import account


def main():
    parser = argparse.ArgumentParser(description='Verify or reject asset')
    parser.add_argument('--network', choices=['testnet', 'mainnet'], default='testnet')
    parser.add_argument('--admin-mnemonic', required=True, help='Admin wallet mnemonic')
    parser.add_argument('--app-id', type=int, required=True, help='Verification contract app ID')
    parser.add_argument('--asa-id', type=int, required=True, help='Asset ID to verify')
    parser.add_argument('--action', choices=['verify', 'reject'], required=True)
    parser.add_argument('--reason', help='Rejection reason (required for reject)')
    
    args = parser.parse_args()
    
    if args.action == 'reject' and not args.reason:
        print('Error: --reason is required for reject action')
        sys.exit(1)
    
    try:
        # Initialize client
        client = AlgorandClient(network=args.network)
        
        # Convert mnemonic to private key
        private_key = mn.to_private_key(args.admin_mnemonic)
        admin_address = account.address_from_private_key(private_key)
        
        # Get suggested params
        params = client.algod_client.suggested_params()
        
        # Prepare arguments
        if args.action == 'verify':
            app_args = [
                b'verify',
                args.asa_id.to_bytes(8, 'big')
            ]
        else:  # reject
            app_args = [
                b'reject',
                args.asa_id.to_bytes(8, 'big'),
                args.reason.encode()
            ]
        
        # Create application call transaction
        print(f'📝 {args.action.capitalize()}ing asset {args.asa_id}...')
        
        txn = ApplicationCallTxn(
            sender=admin_address,
            sp=params,
            index=args.app_id,
            on_complete=OnComplete.NoOpOC,
            app_args=app_args,
            boxes=[[args.app_id, f'verify_{args.asa_id}'.encode()]]  # Box reference for storage
        )
        
        # Sign and send
        signed_txn = txn.sign(private_key)
        tx_id = client.algod_client.send_transaction(signed_txn)
        
        print(f'⏳ Transaction sent: {tx_id}')
        
        # Wait for confirmation
        confirmed = client._wait_for_confirmation(tx_id)
        
        result = {
            'success': True,
            'action': args.action,
            'asaId': args.asa_id,
            'txId': tx_id,
            'confirmedRound': confirmed.get('confirmed-round'),
            'appId': args.app_id,
            'explorerUrl': f'https://{"testnet." if args.network == "testnet" else ""}algoexplorer.io/tx/{tx_id}'
        }
        
        print(json.dumps(result, indent=2))
        print(f'\n✅ Asset {args.asa_id} {args.action}ed successfully!')
        
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
