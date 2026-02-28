"""
Algorand SDK Utilities

Helper functions for interacting with Algorand blockchain.

Functions:
- create_wallet: Generate new Algorand account
- fund_account: Fund account from testnet faucet
- create_asa: Create Algorand Standard Asset
- send_payment: Send ALGO payment
- send_asset: Transfer ASA
- opt_in_asset: Opt-in to receive asset
- deploy_contract: Deploy smart contract
- call_contract: Call application method
- atomic_transfer: Group transactions atomically
"""

import algosdk
from algosdk import account, mnemonic
from algosdk.v2client import algod, indexer
from algosdk.transaction import *
from typing import Dict, List, Optional
import time


class AlgorandClient:
    """
    Algorand SDK client wrapper with utility methods
    """
    
    def __init__(self, network: str = "testnet"):
        """
        Initialize Algorand client
        
        Args:
            network: "testnet", "mainnet", or "sandbox"
        """
        if network == "testnet":
            self.algod_address = "https://testnet-api.algonode.cloud"
            self.algod_token = ""
            self.indexer_address = "https://testnet-idx.algonode.cloud"
        elif network == "mainnet":
            self.algod_address = "https://mainnet-api.algonode.cloud"
            self.algod_token = ""
            self.indexer_address = "https://mainnet-idx.algonode.cloud"
        else:  # sandbox
            self.algod_address = "http://localhost:4001"
            self.algod_token = "a" * 64
            self.indexer_address = "http://localhost:8980"
        
        self.algod_client = algod.AlgodClient(self.algod_token, self.algod_address)
        self.indexer_client = indexer.IndexerClient("", self.indexer_address)
    
    def create_wallet(self) -> Dict[str, str]:
        """
        Generate new Algorand wallet
        
        Returns:
            Dict with 'address', 'private_key', and 'mnemonic'
        """
        private_key, address = account.generate_account()
        mn = mnemonic.from_private_key(private_key)
        
        return {
            "address": address,
            "private_key": private_key,
            "mnemonic": mn
        }
    
    def get_balance(self, address: str) -> int:
        """Get account ALGO balance in microAlgos"""
        account_info = self.algod_client.account_info(address)
        return account_info['amount']
    
    def create_asa(
        self,
        creator_private_key: str,
        asset_name: str,
        unit_name: str,
        total: int,
        decimals: int = 0,
        url: str = "",
        metadata_hash: bytes = None,
        manager: str = None,
        reserve: str = None,
        freeze: str = None,
        clawback: str = None
    ) -> int:
        """
        Create Algorand Standard Asset (ASA)
        
        Args:
            creator_private_key: Creator's private key
            asset_name: Asset name (max 32 bytes)
            unit_name: Unit name (max 8 bytes)
            total: Total units
            decimals: Decimal places
            url: Metadata URL (max 96 bytes)
            metadata_hash: 32-byte hash
            manager: Manager address (can modify manager, reserve, freeze, clawback)
            reserve: Reserve address (receives uncirculated units)
            freeze: Freeze address (can freeze asset for accounts)
            clawback: Clawback address (can reclaim asset)
        
        Returns:
            Asset ID
        """
        creator_address = account.address_from_private_key(creator_private_key)
        
        # Get suggested params
        params = self.algod_client.suggested_params()
        
        # Create asset transaction
        txn = AssetConfigTxn(
            sender=creator_address,
            sp=params,
            total=total,
            default_frozen=False,
            unit_name=unit_name,
            asset_name=asset_name,
            manager=manager or creator_address,
            reserve=reserve or creator_address,
            freeze=freeze or creator_address,
            clawback=clawback or creator_address,
            url=url,
            metadata_hash=metadata_hash,
            decimals=decimals
        )
        
        # Sign and send
        signed_txn = txn.sign(creator_private_key)
        tx_id = self.algod_client.send_transaction(signed_txn)
        
        # Wait for confirmation
        result = self._wait_for_confirmation(tx_id)
        
        # Get asset ID
        asset_id = result['asset-index']
        print(f"✅ Created ASA: {asset_id}")
        return asset_id
    
    def opt_in_asset(self, account_private_key: str, asset_id: int):
        """
        Opt-in to receive an asset
        
        Args:
            account_private_key: Account private key
            asset_id: Asset ID to opt-in
        """
        address = account.address_from_private_key(account_private_key)
        params = self.algod_client.suggested_params()
        
        # Opt-in: send 0 amount to self
        txn = AssetTransferTxn(
            sender=address,
            sp=params,
            receiver=address,
            amt=0,
            index=asset_id
        )
        
        signed_txn = txn.sign(account_private_key)
        tx_id = self.algod_client.send_transaction(signed_txn)
        self._wait_for_confirmation(tx_id)
        print(f"✅ Opted-in to asset {asset_id}")
    
    def send_payment(
        self,
        sender_private_key: str,
        receiver: str,
        amount: int,
        note: str = ""
    ) -> str:
        """
        Send ALGO payment
        
        Args:
            sender_private_key: Sender's private key
            receiver: Receiver address
            amount: Amount in microAlgos
            note: Optional note
        
        Returns:
            Transaction ID
        """
        sender = account.address_from_private_key(sender_private_key)
        params = self.algod_client.suggested_params()
        
        txn = PaymentTxn(
            sender=sender,
            sp=params,
            receiver=receiver,
            amt=amount,
            note=note.encode() if note else None
        )
        
        signed_txn = txn.sign(sender_private_key)
        tx_id = self.algod_client.send_transaction(signed_txn)
        self._wait_for_confirmation(tx_id)
        print(f"✅ Sent {amount/1_000_000} ALGO to {receiver}")
        return tx_id
    
    def send_asset(
        self,
        sender_private_key: str,
        receiver: str,
        asset_id: int,
        amount: int
    ) -> str:
        """Transfer ASA between accounts"""
        sender = account.address_from_private_key(sender_private_key)
        params = self.algod_client.suggested_params()
        
        txn = AssetTransferTxn(
            sender=sender,
            sp=params,
            receiver=receiver,
            amt=amount,
            index=asset_id
        )
        
        signed_txn = txn.sign(sender_private_key)
        tx_id = self.algod_client.send_transaction(signed_txn)
        self._wait_for_confirmation(tx_id)
        print(f"✅ Sent {amount} units of asset {asset_id}")
        return tx_id
    
    def deploy_contract(
        self,
        creator_private_key: str,
        approval_program: bytes,
        clear_program: bytes,
        global_schema: StateSchema,
        local_schema: StateSchema
    ) -> int:
        """Deploy smart contract application"""
        creator = account.address_from_private_key(creator_private_key)
        params = self.algod_client.suggested_params()
        
        txn = ApplicationCreateTxn(
            sender=creator,
            sp=params,
            on_complete=OnComplete.NoOpOC,
            approval_program=approval_program,
            clear_program=clear_program,
            global_schema=global_schema,
            local_schema=local_schema
        )
        
        signed_txn = txn.sign(creator_private_key)
        tx_id = self.algod_client.send_transaction(signed_txn)
        result = self._wait_for_confirmation(tx_id)
        
        app_id = result['application-index']
        print(f"✅ Deployed application: {app_id}")
        return app_id
    
    def call_contract(
        self,
        caller_private_key: str,
        app_id: int,
        app_args: List[bytes],
        accounts: List[str] = None,
        foreign_assets: List[int] = None
    ):
        """Call smart contract method"""
        caller = account.address_from_private_key(caller_private_key)
        params = self.algod_client.suggested_params()
        
        txn = ApplicationCallTxn(
            sender=caller,
            sp=params,
            index=app_id,
            on_complete=OnComplete.NoOpOC,
            app_args=app_args,
            accounts=accounts,
            foreign_assets=foreign_assets
        )
        
        signed_txn = txn.sign(caller_private_key)
        tx_id = self.algod_client.send_transaction(signed_txn)
        self._wait_for_confirmation(tx_id)
        return tx_id
    
    def _wait_for_confirmation(self, tx_id: str, timeout: int = 10):
        """Wait for transaction confirmation"""
        start = time.time()
        while time.time() - start < timeout:
            try:
                result = self.algod_client.pending_transaction_info(tx_id)
                if result.get('confirmed-round', 0) > 0:
                    return result
            except Exception:
                pass
            time.sleep(0.5)
        raise Exception(f"Transaction {tx_id} not confirmed after {timeout}s")


# Example usage
if __name__ == "__main__":
    # Initialize client
    client = AlgorandClient("testnet")
    
    # Create wallet
    wallet = client.create_wallet()
    print(f"Address: {wallet['address']}")
    print(f"Mnemonic: {wallet['mnemonic']}")
    print("\n💡 Fund this account: https://bank.testnet.algorand.network/")
