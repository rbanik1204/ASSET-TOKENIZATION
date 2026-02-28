"""
Asset Registry Smart Contract (PyTeal)

This contract manages the registration and lifecycle of tokenized campus assets.

Features:
- Register new assets (dorm rooms, equipment, facilities)
- Store asset metadata (IPFS CID)
- Track ownership and token information
- Admin approval workflow
- Query asset details

Learning Objectives:
- Stateful smart contract design
- Global and local state management
- Application calls and transaction groups
- Role-based access control
"""

from pyteal import *

def asset_registry_contract():
    """
    Asset Registry Application
    
    Global State:
    - admin (bytes): Administrator address
    - asset_count (uint64): Total number of registered assets
    - paused (uint64): Contract pause status (0=active, 1=paused)
    
    Local State (per asset):
    - asset_id (uint64): ASA ID of the tokenized asset
    - metadata_cid (bytes): IPFS CID for asset metadata
    - owner (bytes): Original asset owner address
    - total_supply (uint64): Total token supply
    - active (uint64): Asset status (0=inactive, 1=active)
    - created_at (uint64): Registration timestamp
    """
    
    # Define state keys
    admin_key = Bytes("admin")
    asset_count_key = Bytes("asset_count")
    paused_key = Bytes("paused")
    
    # Application initialization
    on_create = Seq([
        App.globalPut(admin_key, Txn.sender()),
        App.globalPut(asset_count_key, Int(0)),
        App.globalPut(paused_key, Int(0)),
        Return(Int(1))
    ])
    
    # Register a new asset
    # Args: [asset_id, metadata_cid, total_supply]
    register_asset = Seq([
        # Verify contract not paused
        Assert(App.globalGet(paused_key) == Int(0)),
        
        # Verify caller is admin
        Assert(Txn.sender() == App.globalGet(admin_key)),
        
        # Parse arguments
        Assert(Txn.application_args.length() == Int(4)),
        
        # Store asset data in box storage (Algorand boxes for large data)
        # Key: "asset_" + asset_count
        # Value: concatenated asset data
        App.box_put(
            Concat(Bytes("asset_"), Itob(App.globalGet(asset_count_key))),
            Concat(
                Txn.application_args[1],  # asset_id
                Txn.application_args[2],  # metadata_cid
                Txn.application_args[3],  # total_supply
                Txn.sender(),             # owner
                Itob(Global.latest_timestamp()),  # created_at
                Bytes(base64_decode("AQ=="))      # active flag (1)
            )
        ),
        
        # Increment asset count
        App.globalPut(asset_count_key, App.globalGet(asset_count_key) + Int(1)),
        
        Return(Int(1))
    ])
    
    # Get asset details
    # Args: [asset_index]
    get_asset = Seq([
        Assert(Txn.application_args.length() == Int(2)),
        
        # Return asset data from box storage
        Return(
            App.box_get(
                Concat(Bytes("asset_"), Txn.application_args[1])
            )
        )
    ])
    
    # Update asset status (activate/deactivate)
    # Args: [asset_index, new_status]
    update_status = Seq([
        Assert(Txn.sender() == App.globalGet(admin_key)),
        Assert(Txn.application_args.length() == Int(3)),
        
        # Update status in box storage (last byte)
        # This is simplified - in production, properly parse and update
        Return(Int(1))
    ])
    
    # Pause/unpause contract
    toggle_pause = Seq([
        Assert(Txn.sender() == App.globalGet(admin_key)),
        App.globalPut(
            paused_key,
            If(App.globalGet(paused_key) == Int(0), Int(1), Int(0))
        ),
        Return(Int(1))
    ])
    
    # Transfer admin rights
    # Args: [new_admin_address]
    transfer_admin = Seq([
        Assert(Txn.sender() == App.globalGet(admin_key)),
        Assert(Txn.application_args.length() == Int(2)),
        App.globalPut(admin_key, Txn.application_args[1]),
        Return(Int(1))
    ])
    
    # Main router
    program = Cond(
        [Txn.application_id() == Int(0), on_create],
        [Txn.on_completion() == OnComplete.DeleteApplication, Return(Txn.sender() == App.globalGet(admin_key))],
        [Txn.on_completion() == OnComplete.UpdateApplication, Return(Txn.sender() == App.globalGet(admin_key))],
        [Txn.on_completion() == OnComplete.CloseOut, Return(Int(1))],
        [Txn.on_completion() == OnComplete.OptIn, Return(Int(1))],
        [Txn.application_args[0] == Bytes("register"), register_asset],
        [Txn.application_args[0] == Bytes("get"), get_asset],
        [Txn.application_args[0] == Bytes("update_status"), update_status],
        [Txn.application_args[0] == Bytes("toggle_pause"), toggle_pause],
        [Txn.application_args[0] == Bytes("transfer_admin"), transfer_admin],
    )
    
    return program


def approval_program():
    """Main approval program"""
    return asset_registry_contract()


def clear_program():
    """Clear state program - always approve"""
    return Return(Int(1))


if __name__ == "__main__":
    # Compile contracts
    import os
    
    # Compile approval program
    approval_compiled = compileTeal(approval_program(), mode=Mode.Application, version=8)
    
    # Compile clear program
    clear_compiled = compileTeal(clear_program(), mode=Mode.Application, version=8)
    
    # Create output directory
    os.makedirs("build", exist_ok=True)
    
    # Write to files
    with open("build/asset_registry_approval.teal", "w") as f:
        f.write(approval_compiled)
    
    with open("build/asset_registry_clear.teal", "w") as f:
        f.write(clear_compiled)
    
    print("✅ Asset Registry contract compiled successfully!")
    print("   - Approval: build/asset_registry_approval.teal")
    print("   - Clear: build/asset_registry_clear.teal")
