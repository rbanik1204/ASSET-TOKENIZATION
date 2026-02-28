#!/usr/bin/env python3
"""
atomic_swap.py

Execute atomic swap: ALGO payment + ASA transfer
Ensures both happen or neither happens
"""

import sys
import json
import argparse
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent))

from utils.algorand_sdk import AlgorandClient
from algosdk.transaction import PaymentTxn, AssetTransferTxn, assign_group_id
from algosdk import mnemonic as mn


def main():
    parser = argparse.ArgumentParser(description='Execute atomic swap')
    parser.add_argument('--network', choices=['testnet', 'mainnet'], default='testnet')
    parser.add_argument('--buyer-mnemonic', required=True, help='Buyer wallet mnemonic')
    parser.add_argument('--seller-mnemonic', required=True, help='Seller wallet mnemonic')
    parser.add_argument('--asa-id', type=int, required=True, help='Asset ID')
    parser.add_argument('--asa-amount', type=int, required=True, help='Asset amount')
    parser.add_argument('--algo-amount', type=int, required=True, help='ALGO amount (microAlgos)')
    
    args = parser.parse_args()
    
    try:
        # Initialize client
        client = AlgorandClient(network=args.network)
        
        # Convert mnemonics to keys and addresses
        buyer_private_key = mn.to_private_key(args.buyer_mnemonic)
        seller_private_key = mn.to_private_key(args.seller_mnemonic)
        
        from algosdk import account
        buyer_address = account.address_from_private_key(buyer_private_key)
        seller_address = account.address_from_private_key(seller_private_key)
        
        # Get suggested params
        params = client.algod_client.suggested_params()
        
        # Transaction 1: Buyer sends ALGO to Seller
        payment_txn = PaymentTxn(
            sender=buyer_address,
            sp=params,
            receiver=seller_address,
            amt=args.algo_amount,
            note=b"Asset purchase payment"
        )
        
        # Transaction 2: Seller sends ASA to Buyer
        asset_txn = AssetTransferTxn(
            sender=seller_address,
            sp=params,
            receiver=buyer_address,
            amt=args.asa_amount,
            index=args.asa_id,
            note=b"Asset transfer"
        )
        
        # Group transactions atomically
        gid = assign_group_id([payment_txn, asset_txn])
        
        # Sign transactions
        signed_payment = payment_txn.sign(buyer_private_key)
        signed_asset = asset_txn.sign(seller_private_key)
        
        # Send grouped transactions
        tx_id = client.algod_client.send_transactions([signed_payment, signed_asset])
        
        # Wait for confirmation
        confirmed = client._wait_for_confirmation(tx_id)
        
        result = {
            'success': True,
            'txId': tx_id,
            'groupId': gid.hex() if hasattr(gid, 'hex') else str(gid),
            'confirmedRound': confirmed.get('confirmed-round'),
            'buyer': buyer_address,
            'seller': seller_address,
            'asaId': args.asa_id,
            'asaAmount': args.asa_amount,
            'algoAmount': args.algo_amount
        }
        
        print(json.dumps(result))
        sys.exit(0)
        
    except Exception as e:
        error_result = {
            'success': False,
            'error': str(e),
            'type': type(e).__name__
        }
        print(json.dumps(error_result))
        sys.exit(1)


if __name__ == '__main__':
    main()
