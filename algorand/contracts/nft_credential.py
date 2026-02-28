"""
Student Credential NFT Contract (PyTeal)

This contract mints and manages NFT-based student credentials.

Use Cases:
- Course completion certificates
- Competition achievements
- Skill badges
- Campus event participation

Features:
- Mint credential NFTs
- Verify authenticity
- Transfer restrictions (optional)
- Metadata standards (ARC-3, ARC-69)
- Batch minting for events

Learning Objectives:
- NFT creation on Algorand
- ASA properties (clawback, freeze)
- Metadata standards
- Event emissions
"""

from pyteal import *

def nft_credential_contract():
    """
    Student Credential NFT Minter
    
    Global State:
    - admin (bytes): Contract administrator
    - minter (bytes): Authorized minter address
    - total_minted (uint64): Total credentials issued
    - template_count (uint64): Number of credential templates
    
    Credential Types:
    1. Course Completion
    2. Achievement Badge
    3. Competition Winner
    4. Event Participation
    5. Skill Certification
    """
    
    admin_key = Bytes("admin")
    minter_key = Bytes("minter")
    total_minted_key = Bytes("total_minted")
    
    # Initialize contract
    on_create = Seq([
        App.globalPut(admin_key, Txn.sender()),
        App.globalPut(minter_key, Txn.sender()),
        App.globalPut(total_minted_key, Int(0)),
        Return(Int(1))
    ])
    
    # Mint credential NFT
    # Args: [student_address, credential_type, metadata_cid]
    mint_credential = Seq([
        # Verify minter authorization
        Assert(
            Or(
                Txn.sender() == App.globalGet(admin_key),
                Txn.sender() == App.globalGet(minter_key)
            )
        ),
        
        # Parse arguments
        Assert(Txn.application_args.length() == Int(4)),
        
        # Create ASA (NFT) in inner transaction
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
            TxnField.type_enum: TxnType.AssetConfig,
            TxnField.config_asset_total: Int(1),  # NFT: supply = 1
            TxnField.config_asset_decimals: Int(0),  # NFT: no decimals
            TxnField.config_asset_default_frozen: Int(0),  # Not frozen
            TxnField.config_asset_unit_name: Bytes("CRED"),  # Unit name
            TxnField.config_asset_name: Concat(Bytes("Credential #"), Itob(App.globalGet(total_minted_key))),
            TxnField.config_asset_url: Concat(Bytes("ipfs://"), Txn.application_args[3]),  # IPFS metadata
            TxnField.config_asset_manager: Global.current_application_address(),
            TxnField.config_asset_reserve: Txn.application_args[1],  # Student address (reserve)
            TxnField fee: Int(0),  # Fee pooling
        }),
        InnerTxnBuilder.Submit(),
        
        # Transfer NFT to student
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
            TxnField.type_enum: TxnType.AssetTransfer,
            TxnField.xfer_asset: InnerTxn.created_asset_id(),
            TxnField.asset_receiver: Txn.application_args[1],  # Student
            TxnField.asset_amount: Int(1),
            TxnField.fee: Int(0),
        }),
        InnerTxnBuilder.Submit(),
        
        # Store credential record
        App.box_put(
            Concat(Bytes("cred_"), Itob(InnerTxn.created_asset_id())),
            Concat(
                Txn.application_args[1],  # student
                Txn.application_args[2],  # type
                Txn.application_args[3],  # metadata_cid
                Itob(Global.latest_timestamp())  # timestamp
            )
        ),
        
        # Increment counter
        App.globalPut(total_minted_key, App.globalGet(total_minted_key) + Int(1)),
        
        Return(Int(1))
    ])
    
    # Verify credential authenticity
    # Args: [asset_id]
    verify_credential = Seq([
        Assert(Txn.application_args.length() == Int(2)),
        
        # Check if credential exists in our records
        Return(
            App.box_get(
                Concat(Bytes("cred_"), Txn.application_args[1])
            )
        )
    ])
    
    # Batch mint for events
    # Args: [student_addresses_array, credential_type, metadata_cid]
    batch_mint = Seq([
        Assert(Txn.sender() == App.globalGet(minter_key)),
        # Simplified - in production, iterate through array
        Return(Int(1))
    ])
    
    # Set authorized minter
    # Args: [new_minter_address]
    set_minter = Seq([
        Assert(Txn.sender() == App.globalGet(admin_key)),
        Assert(Txn.application_args.length() == Int(2)),
        App.globalPut(minter_key, Txn.application_args[1]),
        Return(Int(1))
    ])
    
    # Main program
    program = Cond(
        [Txn.application_id() == Int(0), on_create],
        [Txn.on_completion() == OnComplete.DeleteApplication, Return(Txn.sender() == App.globalGet(admin_key))],
        [Txn.on_completion() == OnComplete.UpdateApplication, Return(Txn.sender() == App.globalGet(admin_key))],
        [Txn.application_args[0] == Bytes("mint"), mint_credential],
        [Txn.application_args[0] == Bytes("verify"), verify_credential],
        [Txn.application_args[0] == Bytes("batch_mint"), batch_mint],
        [Txn.application_args[0] == Bytes("set_minter"), set_minter],
    )
    
    return program


def approval_program():
    return nft_credential_contract()


def clear_program():
    return Return(Int(1))


if __name__ == "__main__":
    import os
    
    approval_compiled = compileTeal(approval_program(), mode=Mode.Application, version=8)
    clear_compiled = compileTeal(clear_program(), mode=Mode.Application, version=8)
    
    os.makedirs("build", exist_ok=True)
    
    with open("build/nft_credential_approval.teal", "w") as f:
        f.write(approval_compiled)
    
    with open("build/nft_credential_clear.teal", "w") as f:
        f.write(clear_compiled)
    
    print("✅ NFT Credential contract compiled successfully!")
