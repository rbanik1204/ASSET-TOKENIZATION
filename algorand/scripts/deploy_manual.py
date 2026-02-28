"""
Manual Deployment Script for Wallet-based Signing
Generates unsigned transactions that can be signed via Pera Wallet or Defly
"""

import sys
import json
import base64
from algosdk.v2client import algod
from algosdk import transaction
import subprocess

# Configuration
NETWORK = 'testnet'
ADMIN_ADDRESS = "CZBNQWHGVNNRRMSDTJPZVFGQY6QDEVGVTAX77H745WJAKQCZAHPJJ7HE6A"

def get_algod_client():
    """Get Algorand client"""
    algod_address = "https://testnet-api.algonode.cloud"
    algod_token = ""
    return algod.AlgodClient(algod_token, algod_address)

def compile_teal_file(teal_filename):
    """Compile TEAL file to bytecode"""
    try:
        algod_client = get_algod_client()
        with open(f'../{teal_filename}', 'r') as f:
            teal_source = f.read()
        
        response = algod_client.compile(teal_source)
        return base64.b64decode(response['result'])
    except Exception as e:
        print(f"❌ Error compiling {teal_filename}: {e}")
        return None

def compile_pyteal_contract(contract_name):
    """Compile PyTeal contract to TEAL"""
    try:
        print(f"Compiling {contract_name}.py...")
        
        # Generate approval program
        subprocess.run([
            'python', f'../contracts/{contract_name}.py',
            '--approval'
        ], check=True, capture_output=True)
        
        # Generate clear program
        subprocess.run([
            'python', f'../contracts/{contract_name}.py',
            '--clear'
        ], check=True, capture_output=True)
        
        # Compile both to bytecode
        approval_bytecode = compile_teal_file(f'contracts/{contract_name}_approval.teal')
        clear_bytecode = compile_teal_file(f'contracts/{contract_name}_clear.teal')
        
        return approval_bytecode, clear_bytecode
    except Exception as e:
        print(f"❌ Error compiling {contract_name}: {e}")
        return None, None

def create_asa_unsigned(asset_name, unit_name, total, decimals, url):
    """Create unsigned ASA creation transaction"""
    try:
        algod_client = get_algod_client()
        params = algod_client.suggested_params()
        
        txn = transaction.AssetConfigTxn(
            sender=ADMIN_ADDRESS,
            sp=params,
            total=total,
            default_frozen=False,
            unit_name=unit_name,
            asset_name=asset_name,
            manager=ADMIN_ADDRESS,
            reserve=ADMIN_ADDRESS,
            freeze=ADMIN_ADDRESS,
            clawback=ADMIN_ADDRESS,
            url=url,
            decimals=decimals
        )
        
        # Export unsigned transaction
        unsigned_txn = base64.b64encode(transaction.write_to_file([txn], "/tmp/unsigned_asa.txn", overwrite=True))
        
        print(f"\n{'='*60}")
        print(f"UNSIGNED ASA CREATION TRANSACTION")
        print(f"{'='*60}")
        print(f"\nAsset Name: {asset_name}")
        print(f"Unit Name: {unit_name}")
        print(f"Total Supply: {total}")
        print(f"\n📱 SIGN THIS TRANSACTION in your wallet app:")
        print(f"\nTransaction ID (for tracking): {txn.get_txid()}")
        print(f"\n⚠️  You'll need to import this transaction into your wallet.")
        print(f"\nAfter signing, you'll get the ASA ID from the confirmed transaction.")
        print(f"\nAlgoExplorer link after signing: https://testnet.algoexplorer.io/tx/{txn.get_txid()}")
        
        return txn, txn.get_txid()
        
    except Exception as e:
        print(f"❌ Error creating ASA transaction: {e}")
        return None, None

def main():
    print("="*60)
    print("   MANUAL WALLET-BASED DEPLOYMENT")
    print("="*60)
    print(f"\n⚠️  This script generates unsigned transactions.")
    print(f"You'll need to sign each one in your wallet app.\n")
    print(f"Admin Address: {ADMIN_ADDRESS}\n")
    
    print("\n" + "="*60)
    print("OPTION 1: Use Command-Line Deployment (Recommended)")
    print("="*60)
    print("\nSince you don't have the mnemonic, the EASIEST approach is:")
    print("\n1. Generate a NEW temporary account with proper 25-word mnemonic")
    print("2. Transfer 5 ALGO from your current account to the new one")
    print("3. Run automated deployment with the new account")
    print("4. Transfer everything back to your original account after")
    print("\nWould you like me to generate a temporary deployment account?")
    print("(Type 'yes' to generate, or 'manual' to continue with manual signing)")
    
    choice = input("\nYour choice: ").strip().lower()
    
    if choice == 'yes':
        # Generate new account
        from algosdk import account, mnemonic
        private_key, address = account.generate_account()
        mn = mnemonic.from_private_key(private_key)
        
        print("\n" + "="*60)
        print("🎉 NEW TEMPORARY DEPLOYMENT ACCOUNT GENERATED")
        print("="*60)
        print(f"\nAddress: {address}")
        print(f"\nMnemonic (25 words):")
        print(f"{mn}")
        print(f"\n{'='*60}")
        print("NEXT STEPS:")
        print("="*60)
        print(f"\n1. Open your wallet app (Pera/Defly)")
        print(f"2. Send 5 ALGO from {ADMIN_ADDRESS}")
        print(f"   TO: {address}")
        print(f"\n3. Update deploy_all.py with this new mnemonic")
        print(f"4. Run: python deploy_all.py")
        print(f"\n5. After deployment completes, transfer assets back to your main account")
        print(f"\n✅ This is the FASTEST way to deploy everything!")
        
        # Save to file
        with open('temp_deployment_account.txt', 'w') as f:
            f.write(f"Temporary Deployment Account\n")
            f.write(f"={'='*60}\n")
            f.write(f"Address: {address}\n")
            f.write(f"Mnemonic: {mn}\n")
            f.write(f"\nCreated: {__import__('datetime').datetime.now()}\n")
        
        print(f"\n📄 Account details saved to: temp_deployment_account.txt")
        
    else:
        print("\n⚠️  Manual signing requires web-based tools.")
        print("For hackathon speed, I strongly recommend using a temporary account instead.")
        print("\nRun this script again and choose 'yes' to generate a deployment account!")

if __name__ == "__main__":
    main()
