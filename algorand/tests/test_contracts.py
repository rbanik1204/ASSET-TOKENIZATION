"""
Unit Tests for Algorand Smart Contracts

Run with: pytest tests/test_contracts.py -v
"""

import pytest
from algosdk import account, mnemonic, transaction
from algosdk.v2client import algod
import base64
import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.algorand_sdk import AlgorandClient


# Test configuration
ALGOD_ADDRESS = "https://testnet-api.algonode.cloud"
ALGOD_TOKEN = ""  # Public endpoint


@pytest.fixture
def client():
    """Create Algorand client"""
    return AlgorandClient("testnet")


@pytest.fixture
def test_accounts():
    """Create test accounts"""
    accounts = []
    for i in range(3):
        private_key, address = account.generate_account()
        mn = mnemonic.from_private_key(private_key)
        accounts.append({
            "address": address,
            "private_key": private_key,
            "mnemonic": mn
        })
    return accounts


class TestWalletOperations:
    """Test basic wallet operations"""
    
    def test_create_wallet(self, client):
        """Test wallet creation"""
        wallet = client.create_wallet()
        
        assert "address" in wallet
        assert "private_key" in wallet
        assert "mnemonic" in wallet
        assert len(wallet["address"]) == 58  # Algorand address length
        assert len(wallet["mnemonic"].split()) == 25  # 25-word mnemonic
    
    def test_get_balance(self, client, test_accounts):
        """Test balance check"""
        account = test_accounts[0]
        balance = client.get_balance(account["address"])
        
        assert balance >= 0
        assert isinstance(balance, int)


class TestAssetOperations:
    """Test ASA creation and transfers"""
    
    @pytest.mark.skip(reason="Requires funded account")
    def test_create_asa(self, client, test_accounts):
        """Test ASA creation"""
        creator = test_accounts[0]
        
        # Ensure account has funds
        balance = client.get_balance(creator["address"])
        if balance < 1000000:  # Less than 1 ALGO
            pytest.skip("Account needs funding from testnet faucet")
        
        # Create ASA
        asset_id = client.create_asa(
            creator_private_key=creator["private_key"],
            asset_name="Test Token",
            unit_name="TEST",
            total=1000,
            decimals=0
        )
        
        assert asset_id > 0
        assert isinstance(asset_id, int)
    
    @pytest.mark.skip(reason="Requires funded accounts")
    def test_opt_in_and_transfer(self, client, test_accounts):
        """Test opt-in and asset transfer"""
        creator = test_accounts[0]
        receiver = test_accounts[1]
        
        # Create asset
        asset_id = client.create_asa(
            creator_private_key=creator["private_key"],
            asset_name="Transfer Test",
            unit_name="XFER",
            total=100,
            decimals=0
        )
        
        # Receiver opts in
        client.opt_in_asset(receiver["private_key"], asset_id)
        
        # Transfer
        tx_id = client.send_asset(
            sender_private_key=creator["private_key"],
            receiver=receiver["address"],
            asset_id=asset_id,
            amount=10
        )
        
        assert len(tx_id) == 52  # Algorand transaction ID length


class TestNFTOperations:
    """Test NFT minting"""
    
    @pytest.mark.skip(reason="Requires funded account")
    def test_mint_nft(self, client, test_accounts):
        """Test NFT creation"""
        creator = test_accounts[0]
        student = test_accounts[1]
        
        # Create NFT
        nft_id = client.create_asa(
            creator_private_key=creator["private_key"],
            asset_name="Test Credential",
            unit_name="CRED1",
            total=1,  # NFT: only 1
            decimals=0,  # NFT: indivisible
            url="ipfs://QmTest123",
            reserve=student["address"]
        )
        
        assert nft_id > 0
        
        # Verify NFT properties
        algod_client = client.algod_client
        asset_info = algod_client.asset_info(nft_id)
        
        assert asset_info['params']['total'] == 1
        assert asset_info['params']['decimals'] == 0
        assert asset_info['params']['url'] == "ipfs://QmTest123"
        assert asset_info['params']['reserve'] == student["address"]


class TestContractDeployment:
    """Test smart contract deployment"""
    
    @pytest.mark.skip(reason="Requires compiled contracts")
    def test_deploy_asset_registry(self, client, test_accounts):
        """Test deploying asset registry contract"""
        deployer = test_accounts[0]
        
        # Load compiled TEAL
        with open("contracts/build/asset_registry_approval.teal") as f:
            approval_teal = f.read()
        
        with open("contracts/build/asset_registry_clear.teal") as f:
            clear_teal = f.read()
        
        # Compile
        algod_client = client.algod_client
        approval_compiled = algod_client.compile(approval_teal)
        approval_bytes = base64.b64decode(approval_compiled['result'])
        
        clear_compiled = algod_client.compile(clear_teal)
        clear_bytes = base64.b64decode(clear_compiled['result'])
        
        # Deploy
        from algosdk.transaction import StateSchema
        
        global_schema = StateSchema(num_uints=3, num_byte_slices=1)
        local_schema = StateSchema(num_uints=0, num_byte_slices=0)
        
        app_id = client.deploy_contract(
            creator_private_key=deployer["private_key"],
            approval_program=approval_bytes,
            clear_program=clear_bytes,
            global_schema=global_schema,
            local_schema=local_schema
        )
        
        assert app_id > 0
        
        # Verify app exists
        app_info = algod_client.application_info(app_id)
        assert app_info['id'] == app_id


class TestPaymentTransactions:
    """Test ALGO payment transactions"""
    
    @pytest.mark.skip(reason="Requires funded accounts")
    def test_send_payment(self, client, test_accounts):
        """Test ALGO payment"""
        sender = test_accounts[0]
        receiver = test_accounts[1]
        
        # Send 1 ALGO
        tx_id = client.send_payment(
            sender_private_key=sender["private_key"],
            receiver=receiver["address"],
            amount=1000000,  # 1 ALGO in microAlgos
            note="Test payment"
        )
        
        assert len(tx_id) == 52
        
        # Wait for confirmation
        client._wait_for_confirmation(tx_id)
        
        # Check receiver balance increased
        balance = client.get_balance(receiver["address"])
        assert balance >= 1000000


class TestUtilityFunctions:
    """Test SDK utility functions"""
    
    def test_mnemonic_conversion(self):
        """Test mnemonic to private key conversion"""
        # Generate wallet
        private_key, address = account.generate_account()
        mn = mnemonic.from_private_key(private_key)
        
        # Convert back
        recovered_pk = mnemonic.to_private_key(mn)
        recovered_addr = account.address_from_private_key(recovered_pk)
        
        assert recovered_pk == private_key
        assert recovered_addr == address
    
    def test_address_validation(self):
        """Test address format validation"""
        valid_address = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ"
        
        # Algorand addresses are 58 characters
        assert len(valid_address) == 58
        
        # Only uppercase + numbers
        assert valid_address.isalnum()
        assert valid_address.isupper()


class TestErrorHandling:
    """Test error conditions"""
    
    def test_insufficient_balance(self, client, test_accounts):
        """Test transaction with insufficient funds"""
        unfunded_account = test_accounts[0]
        receiver = test_accounts[1]
        
        with pytest.raises(Exception):
            # This should fail - account has 0 balance
            client.send_payment(
                sender_private_key=unfunded_account["private_key"],
                receiver=receiver["address"],
                amount=1000000
            )
    
    def test_invalid_asset_id(self, client, test_accounts):
        """Test operations with non-existent asset"""
        account = test_accounts[0]
        
        with pytest.raises(Exception):
            # Asset ID 99999999 likely doesn't exist
            client.opt_in_asset(account["private_key"], 99999999)


# Integration Tests
class TestCampusUseCase:
    """Test complete campus tokenization flow"""
    
    @pytest.mark.skip(reason="Full integration test - requires setup")
    def test_dorm_tokenization_flow(self, client, test_accounts):
        """
        Test complete flow:
        1. Create dorm room token
        2. Students opt-in
        3. Distribute tokens
        4. Transfer on marketplace
        """
        admin = test_accounts[0]
        student1 = test_accounts[1]
        student2 = test_accounts[2]
        
        # 1. Create dorm token (1000 shares)
        dorm_token_id = client.create_asa(
            creator_private_key=admin["private_key"],
            asset_name="Dorm Room 301",
            unit_name="DORM301",
            total=1000,
            decimals=0
        )
        
        # 2. Students opt-in
        client.opt_in_asset(student1["private_key"], dorm_token_id)
        client.opt_in_asset(student2["private_key"], dorm_token_id)
        
        # 3. Distribute tokens
        client.send_asset(
            sender_private_key=admin["private_key"],
            receiver=student1["address"],
            asset_id=dorm_token_id,
            amount=500
        )
        
        client.send_asset(
            sender_private_key=admin["private_key"],
            receiver=student2["address"],
            asset_id=dorm_token_id,
            amount=500
        )
        
        # 4. Student1 sells to Student2
        client.send_asset(
            sender_private_key=student1["private_key"],
            receiver=student2["address"],
            asset_id=dorm_token_id,
            amount=100
        )
        
        # Verify final balances
        algod_client = client.algod_client
        
        student1_info = algod_client.account_asset_info(
            student1["address"], 
            dorm_token_id
        )
        assert student1_info['asset-holding']['amount'] == 400
        
        student2_info = algod_client.account_asset_info(
            student2["address"], 
            dorm_token_id
        )
        assert student2_info['asset-holding']['amount'] == 600


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
