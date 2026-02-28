"""
Automated TestNet Deployment Script
Deploys all 3 smart contracts after account funding
"""

import sys
import os
import json
import subprocess
from algosdk.v2client import algod
from algosdk import mnemonic, account

# Configuration
NETWORK = 'testnet'
MNEMONIC = "rookie accident slush mother crack bless pistol wife universe have mirror suffer manage volcano artwork scale tumble miracle maple correct hedgehog economy rescue abstract coral"

def get_algod_client():
    """Get Algorand client"""
    algod_address = "https://testnet-api.algonode.cloud"
    algod_token = ""
    return algod.AlgodClient(algod_token, algod_address)

def check_balance():
    """Check if account has sufficient balance"""
    try:
        algod_client = get_algod_client()
        private_key = mnemonic.to_private_key(MNEMONIC)
        address = account.address_from_private_key(private_key)
        
        account_info = algod_client.account_info(address)
        balance = account_info['amount'] / 1_000_000  # Convert microAlgos to ALGO
        
        print(f"Account: {address}")
        print(f"Balance: {balance} ALGO")
        
        if balance < 0.5:
            print(f"\n❌ Insufficient balance! Need at least 0.5 ALGO.")
            print(f"Visit: https://bank.testnet.algorand.network/")
            print(f"Fund: {address}")
            return False
        
        print(f"✅ Sufficient balance for deployment!")
        return True
    except Exception as e:
        print(f"❌ Error checking balance: {e}")
        return False

def create_test_asa():
    """Create test ASA"""
    try:
        print("\n=== Creating Test ASA ===")
        
        result = subprocess.run([
            'python', 'create_asa.py',
            '--network', NETWORK,
            '--creator-mnemonic', MNEMONIC,
            '--asset-name', 'Campus Dorm Room 301',
            '--unit-name', 'CDR301',
            '--total', '10000',
            '--url', 'https://asset-linked-c4ef2.web.app',
            '--decimals', '0'
        ], capture_output=True, text=True)
        
        if result.returncode != 0:
            print(f"❌ ASA creation failed: {result.stdout}")
            return None
        
        data = json.loads(result.stdout)
        if data.get('success'):
            asa_id = data['assetId']
            print(f"✅ ASA created: {asa_id}")
            print(f"   Explorer: {data['explorerUrl']}")
            return asa_id
        else:
            print(f"❌ ASA creation failed: {data.get('error')}")
            return None
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

def deploy_verification_contract():
    """Deploy verification contract"""
    try:
        print("\n=== Deploying Verification Contract ===")
        
        result = subprocess.run([
            'python', 'deploy_verification.py',
            '--network', NETWORK,
            '--creator-mnemonic', MNEMONIC
        ], capture_output=True, text=True)
        
        if result.returncode != 0:
            print(f"❌ Deployment failed: {result.stdout}")
            return None
        
        data = json.loads(result.stdout)
        if data.get('success'):
            app_id = data['appId']
            print(f"✅ Verification contract deployed: {app_id}")
            print(f"   Explorer: {data['explorerUrl']}")
            return app_id
        else:
            print(f"❌ Deployment failed: {data.get('error')}")
            return None
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

def deploy_income_contract(asa_id):
    """Deploy income distribution contract"""
    try:
        print("\n=== Deploying Income Contract ===")
        
        result = subprocess.run([
            'python', 'deploy_income.py',
            '--network', NETWORK,
            '--creator-mnemonic', MNEMONIC,
            '--asa-id', str(asa_id)
        ], capture_output=True, text=True)
        
        if result.returncode != 0:
            print(f"❌ Deployment failed: {result.stdout}")
            return None
        
        data = json.loads(result.stdout)
        if data.get('success'):
            app_id = data['appId']
            print(f"✅ Income contract deployed: {app_id}")
            print(f"   Explorer: {data['explorerUrl']}")
            return app_id
        else:
            print(f"❌ Deployment failed: {data.get('error')}")
            return None
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

def deploy_governance_contract(asa_id):
    """Deploy governance contract"""
    try:
        print("\n=== Deploying Governance Contract ===")
        
        result = subprocess.run([
            'python', 'deploy_governance.py',
            '--network', NETWORK,
            '--creator-mnemonic', MNEMONIC,
            '--asa-id', str(asa_id)
        ], capture_output=True, text=True)
        
        if result.returncode != 0:
            print(f"❌ Deployment failed: {result.stdout}")
            return None
        
        data = json.loads(result.stdout)
        if data.get('success'):
            app_id = data['appId']
            print(f"✅ Governance contract deployed: {app_id}")
            print(f"   Explorer: {data['explorerUrl']}")
            return app_id
        else:
            print(f"❌ Deployment failed: {data.get('error')}")
            return None
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

def generate_env_file(asa_id, verification_id, income_id, governance_id):
    """Generate .env file with all IDs"""
    try:
        private_key = mnemonic.to_private_key(MNEMONIC)
        address = account.address_from_private_key(private_key)
        
        env_content = f"""# Algorand Configuration - TestNet Deployment
ALGORAND_NETWORK=testnet
ADMIN_ALGORAND_MNEMONIC={MNEMONIC}
ADMIN_ALGORAND_ADDRESS={address}

# Smart Contract App IDs
VERIFICATION_APP_ID={verification_id}
INCOME_APP_ID={income_id}
GOVERNANCE_APP_ID={governance_id}

# Test ASA ID
TEST_ASA_ID={asa_id}

# AlgoExplorer Links
# Account: https://testnet.algoexplorer.io/address/{address}
# ASA: https://testnet.algoexplorer.io/asset/{asa_id}
# Verification: https://testnet.algoexplorer.io/application/{verification_id}
# Income: https://testnet.algoexplorer.io/application/{income_id}
# Governance: https://testnet.algoexplorer.io/application/{governance_id}
"""
        
        # Write to backend .env
        backend_env = os.path.join('..', '..', 'apps', 'backend', '.env')
        with open(backend_env, 'w') as f:
            f.write(env_content)
        
        print(f"\n✅ Environment file updated: {backend_env}")
        
        # Also create a summary file
        summary = {
            "network": NETWORK,
            "deployerAddress": address,
            "asaId": asa_id,
            "verificationAppId": verification_id,
            "incomeAppId": income_id,
            "governanceAppId": governance_id,
            "links": {
                "account": f"https://testnet.algoexplorer.io/address/{address}",
                "asa": f"https://testnet.algoexplorer.io/asset/{asa_id}",
                "verification": f"https://testnet.algoexplorer.io/application/{verification_id}",
                "income": f"https://testnet.algoexplorer.io/application/{income_id}",
                "governance": f"https://testnet.algoexplorer.io/application/{governance_id}"
            }
        }
        
        summary_file = 'deployment_summary.json'
        with open(summary_file, 'w') as f:
            json.dump(summary, f, indent=2)
        
        print(f"✅ Deployment summary: {summary_file}")
        
        return True
    except Exception as e:
        print(f"❌ Error generating env file: {e}")
        return False

def main():
    print("=" * 60)
    print("   ALGORAND TESTNET DEPLOYMENT AUTOMATION")
    print("=" * 60)
    
    # Step 1: Check balance
    if not check_balance():
        print("\n⚠️  Please fund your account first!")
        print(f"   Visit: https://bank.testnet.algorand.network/")
        sys.exit(1)
    
    # Step 2: Create ASA
    asa_id = create_test_asa()
    if not asa_id:
        print("\n❌ Deployment aborted: ASA creation failed")
        sys.exit(1)
    
    # Step 3: Deploy Verification Contract
    verification_id = deploy_verification_contract()
    if not verification_id:
        print("\n❌ Deployment aborted: Verification contract failed")
        sys.exit(1)
    
    # Step 4: Deploy Income Contract
    income_id = deploy_income_contract(asa_id)
    if not income_id:
        print("\n❌ Deployment aborted: Income contract failed")
        sys.exit(1)
    
    # Step 5: Deploy Governance Contract
    governance_id = deploy_governance_contract(asa_id)
    if not governance_id:
        print("\n❌ Deployment aborted: Governance contract failed")
        sys.exit(1)
    
    # Step 6: Generate environment files
    if not generate_env_file(asa_id, verification_id, income_id, governance_id):
        print("\n⚠️  Contracts deployed but env file generation failed")
        sys.exit(1)
    
    # Success!
    print("\n" + "=" * 60)
    print("   ✅ DEPLOYMENT COMPLETE!")
    print("=" * 60)
    print(f"\nASA ID: {asa_id}")
    print(f"Verification App: {verification_id}")
    print(f"Income App: {income_id}")
    print(f"Governance App: {governance_id}")
    print("\nNext steps:")
    print("1. Restart backend server to load new env variables")
    print("2. Test verification flow")
    print("3. Test atomic swaps")
    print("4. Test income distribution")
    print("5. Test governance voting")
    print("\n🎉 All ready for Algorand x Encode AI Hackathon!")

if __name__ == "__main__":
    main()
