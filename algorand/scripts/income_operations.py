"""
Deposit Income or Claim Income from Distribution Contract
"""

import argparse
import json
from algosdk.v2client import algod
from algosdk import account, mnemonic, transaction
from algosdk.transaction import ApplicationCallTxn, PaymentTxn, OnComplete, assign_group_id


def get_algod_client(network: str):
    """Get Algorand client for specified network"""
    if network == 'testnet':
        algod_address = "https://testnet-api.algonode.cloud"
        algod_token = ""
    else:  # mainnet
        algod_address = "https://mainnet-api.algonode.cloud"
        algod_token = ""
    
    return algod.AlgodClient(algod_token, algod_address)


def get_application_address(app_id: int) -> str:
    """Get application address from app ID"""
    return algod.logic.get_application_address(app_id)


def deposit_income(network: str, admin_mnemonic: str, app_id: int, amount_microalgo: int):
    """Deposit income to distribution contract (admin only)"""
    try:
        algod_client = get_algod_client(network)
        
        # Get admin account
        admin_private_key = mnemonic.to_private_key(admin_mnemonic)
        admin_address = account.address_from_private_key(admin_private_key)
        
        print(f"Depositing from: {admin_address}")
        print(f"Amount: {amount_microalgo / 1_000_000} ALGO")
        
        # Get application address
        app_address = get_application_address(app_id)
        
        # Get suggested params
        params = algod_client.suggested_params()
        
        # Create payment transaction (deposit ALGO to contract)
        payment_txn = PaymentTxn(
            sender=admin_address,
            sp=params,
            receiver=app_address,
            amt=amount_microalgo
        )
        
        # Create application call transaction
        app_call_txn = ApplicationCallTxn(
            sender=admin_address,
            sp=params,
            index=app_id,
            on_complete=OnComplete.NoOpOC,
            app_args=[b'deposit']
        )
        
        # Group transactions
        gid = transaction.calculate_group_id([payment_txn, app_call_txn])
        payment_txn.group = gid
        app_call_txn.group = gid
        
        # Sign transactions
        signed_payment = payment_txn.sign(admin_private_key)
        signed_app_call = app_call_txn.sign(admin_private_key)
        
        # Send transaction group
        tx_id = algod_client.send_transactions([signed_payment, signed_app_call])
        print(f"Transaction Group ID: {tx_id}")
        
        # Wait for confirmation
        confirmed_txn = transaction.wait_for_confirmation(algod_client, tx_id, 4)
        
        explorer_base = "https://testnet.algoexplorer.io" if network == 'testnet' else "https://algoexplorer.io"
        explorer_url = f"{explorer_base}/tx/group/{tx_id}"
        
        result = {
            "success": True,
            "action": "deposit",
            "txId": tx_id,
            "appId": app_id,
            "amount": amount_microalgo,
            "confirmedRound": confirmed_txn['confirmed-round'],
            "explorerUrl": explorer_url
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


def claim_income(network: str, holder_mnemonic: str, app_id: int, holder_balance: int):
    """Claim income from distribution contract (ASA holder)"""
    try:
        algod_client = get_algod_client(network)
        
        # Get holder account
        holder_private_key = mnemonic.to_private_key(holder_mnemonic)
        holder_address = account.address_from_private_key(holder_private_key)
        
        print(f"Claiming for: {holder_address}")
        print(f"Holder balance: {holder_balance}")
        
        # Get suggested params
        params = algod_client.suggested_params()
        
        # Create application call transaction
        txn = ApplicationCallTxn(
            sender=holder_address,
            sp=params,
            index=app_id,
            on_complete=OnComplete.NoOpOC,
            app_args=[
                b'claim',
                holder_balance.to_bytes(8, 'big')
            ],
            boxes=[[app_id, f'claim_{holder_address}'.encode()]]
        )
        
        # Sign transaction
        signed_txn = txn.sign(holder_private_key)
        
        # Send transaction
        tx_id = algod_client.send_transaction(signed_txn)
        print(f"Transaction ID: {tx_id}")
        
        # Wait for confirmation
        confirmed_txn = transaction.wait_for_confirmation(algod_client, tx_id, 4)
        
        explorer_base = "https://testnet.algoexplorer.io" if network == 'testnet' else "https://algoexplorer.io"
        explorer_url = f"{explorer_base}/tx/{tx_id}"
        
        result = {
            "success": True,
            "action": "claim",
            "txId": tx_id,
            "appId": app_id,
            "holderAddress": holder_address,
            "confirmedRound": confirmed_txn['confirmed-round'],
            "explorerUrl": explorer_url
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
    parser = argparse.ArgumentParser(description='Deposit or Claim Income')
    parser.add_argument('--network', choices=['testnet', 'mainnet'], required=True)
    parser.add_argument('--app-id', type=int, required=True)
    parser.add_argument('--action', choices=['deposit', 'claim'], required=True)
    
    # For deposit
    parser.add_argument('--admin-mnemonic', help='Admin mnemonic (for deposit)')
    parser.add_argument('--amount', type=float, help='Amount in ALGO (for deposit)')
    
    # For claim
    parser.add_argument('--holder-mnemonic', help='Holder mnemonic (for claim)')
    parser.add_argument('--holder-balance', type=int, help='Holder ASA balance (for claim)')
    
    args = parser.parse_args()
    
    if args.action == 'deposit':
        if not args.admin_mnemonic or not args.amount:
            print("Error: --admin-mnemonic and --amount required for deposit")
            return
        
        amount_microalgo = int(args.amount * 1_000_000)
        deposit_income(args.network, args.admin_mnemonic, args.app_id, amount_microalgo)
    
    elif args.action == 'claim':
        if not args.holder_mnemonic or args.holder_balance is None:
            print("Error: --holder-mnemonic and --holder-balance required for claim")
            return
        
        claim_income(args.network, args.holder_mnemonic, args.app_id, args.holder_balance)


if __name__ == "__main__":
    main()
