#!/usr/bin/env python3
"""
create_asa.py

CLI script to create Algorand Standard Assets
Called by Node.js backend via child process
"""

import sys
import json
import argparse
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from utils.algorand_sdk import AlgorandClient


def main():
    parser = argparse.ArgumentParser(description='Create Algorand Standard Asset')
    parser.add_argument('--network', choices=['testnet', 'mainnet'], default='testnet')
    parser.add_argument('--creator-mnemonic', required=True, help='Creator wallet mnemonic')
    parser.add_argument('--asset-name', required=True, help='Asset name (max 32 bytes)')
    parser.add_argument('--unit-name', required=True, help='Unit name (max 8 bytes)')
    parser.add_argument('--total', type=int, required=True, help='Total supply')
    parser.add_argument('--decimals', type=int, default=0, help='Decimal places')
    parser.add_argument('--url', default='', help='Metadata URL')
    parser.add_argument('--metadata', default='{}', help='JSON metadata')
    parser.add_argument('--manager', help='Manager address')
    parser.add_argument('--reserve', help='Reserve address')
    parser.add_argument('--freeze', help='Freeze address')
    parser.add_argument('--clawback', help='Clawback address')
    
    args = parser.parse_args()
    
    try:
        # Initialize Algorand client
        client = AlgorandClient(network=args.network)
        
        # Parse metadata and create hash
        metadata = json.loads(args.metadata)
        metadata_json = json.dumps(metadata)
        
        # Hash metadata (SHA-256)
        import hashlib
        metadata_hash = hashlib.sha256(metadata_json.encode()).digest()
        
        # Convert mnemonic to private key
        from algosdk import mnemonic as mn
        private_key = mn.to_private_key(args.creator_mnemonic)
        
        # Create ASA
        asset_id = client.create_asa(
            creator_private_key=private_key,
            asset_name=args.asset_name[:32],
            unit_name=args.unit_name[:8],
            total=args.total,
            decimals=args.decimals,
            url=args.url[:96],
            metadata_hash=metadata_hash,
            manager=args.manager,
            reserve=args.reserve,
            freeze=args.freeze,
            clawback=args.clawback
        )
        
        # Return success result
        result = {
            'success': True,
            'asaId': asset_id,
            'network': args.network,
            'metadata': metadata,
            'explorerUrl': f'https://{"testnet." if args.network == "testnet" else ""}algoexplorer.io/asset/{asset_id}'
        }
        
        print(json.dumps(result))
        sys.exit(0)
        
    except Exception as e:
        # Return error result
        error_result = {
            'success': False,
            'error': str(e),
            'type': type(e).__name__
        }
        print(json.dumps(error_result))
        sys.exit(1)


if __name__ == '__main__':
    main()
