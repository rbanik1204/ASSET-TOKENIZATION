"""
Asset Verification Smart Contract (PyTeal)

This contract manages the verification status of tokenized assets (ASAs).
Only verified assets can be traded on the marketplace.

Features:
- Admin can verify/reject assets
- Store verification status on-chain
- Verification history tracking
- Query verification status

Global State:
- admin (bytes): Administrator address who can verify assets
- total_verified (uint64): Total number of verified assets
- total_rejected (uint64): Total number of rejected assets
- paused (uint64): Contract pause status (0=active, 1=paused)

Box Storage (per ASA):
- Key: "verify_" + asa_id
- Value: {
    status: uint64 (0=pending, 1=verified, 2=rejected),
    verifier: bytes,
    timestamp: uint64,
    reason: bytes (optional rejection reason)
  }
"""

from pyteal import *


def approval_program():
    """Asset Verification Contract - Approval Program"""
    
    # Define state keys
    admin_key = Bytes("admin")
    total_verified_key = Bytes("total_verified")
    total_rejected_key = Bytes("total_rejected")
    paused_key = Bytes("paused")
    
    # Application initialization
    on_create = Seq([
        App.globalPut(admin_key, Txn.sender()),
        App.globalPut(total_verified_key, Int(0)),
        App.globalPut(total_rejected_key, Int(0)),
        App.globalPut(paused_key, Int(0)),
        Return(Int(1))
    ])
    
    # **Verify Asset**
    # Args: [asa_id, reason (optional)]
    verify_asset = Seq([
        # Verify not paused
        Assert(App.globalGet(paused_key) == Int(0)),
        
        # Verify caller is admin
        Assert(Txn.sender() == App.globalGet(admin_key)),
        
        # Parse arguments
        Assert(Txn.application_args.length() >= Int(2)),
        
        # Store verification in box storage
        # Key: "verify_" + asa_id
        App.box_put(
            Concat(Bytes("verify_"), Txn.application_args[1]),
            Concat(
                Itob(Int(1)),  # status = 1 (verified)
                Txn.sender(),  # verifier address
                Itob(Global.latest_timestamp()),  # timestamp
                Bytes("")  # empty reason
            )
        ),
        
        # Increment verified count
        App.globalPut(
            total_verified_key, 
            App.globalGet(total_verified_key) + Int(1)
        ),
        
        Return(Int(1))
    ])
    
    # **Reject Asset**
    # Args: [asa_id, reason]
    reject_asset = Seq([
        # Verify not paused
        Assert(App.globalGet(paused_key) == Int(0)),
        
        # Verify caller is admin
        Assert(Txn.sender() == App.globalGet(admin_key)),
        
        # Parse arguments (reason is required for rejection)
        Assert(Txn.application_args.length() >= Int(3)),
        
        # Store rejection in box storage
        App.box_put(
            Concat(Bytes("verify_"), Txn.application_args[1]),
            Concat(
                Itob(Int(2)),  # status = 2 (rejected)
                Txn.sender(),  # verifier address
                Itob(Global.latest_timestamp()),  # timestamp
                Txn.application_args[2]  # rejection reason
            )
        ),
        
        # Increment rejected count
        App.globalPut(
            total_rejected_key,
            App.globalGet(total_rejected_key) + Int(1)
        ),
        
        Return(Int(1))
    ])
    
    # **Get Verification Status**
    # Args: [asa_id]
    # Returns: Box data if exists
    get_verification = Seq([
        Assert(Txn.application_args.length() == Int(2)),
        
        # Check if verification exists
        Return(
            App.box_get(
                Concat(Bytes("verify_"), Txn.application_args[1])
            ).hasValue()
        )
    ])
    
    # **Update Admin**
    # Args: [new_admin_address]
    update_admin = Seq([
        # Only current admin can update
        Assert(Txn.sender() == App.globalGet(admin_key)),
        Assert(Txn.application_args.length() == Int(2)),
        
        App.globalPut(admin_key, Txn.application_args[1]),
        Return(Int(1))
    ])
    
    # **Pause/Unpause Contract**
    # Args: [pause_status] (0=unpause, 1=pause)
    toggle_pause = Seq([
        # Only admin can pause
        Assert(Txn.sender() == App.globalGet(admin_key)),
        Assert(Txn.application_args.length() == Int(2)),
        
        App.globalPut(paused_key, Btoi(Txn.application_args[1])),
        Return(Int(1))
    ])
    
    # **Bulk Verify**
    # Args: [asa_id_1, asa_id_2, ...]
    # Verify multiple assets at once
    bulk_verify = Seq([
        Assert(App.globalGet(paused_key) == Int(0)),
        Assert(Txn.sender() == App.globalGet(admin_key)),
        Assert(Txn.application_args.length() >= Int(2)),
        
        # Note: In production, loop through args
        # For now, just verify first asset as example
        App.box_put(
            Concat(Bytes("verify_"), Txn.application_args[1]),
            Concat(
                Itob(Int(1)),
                Txn.sender(),
                Itob(Global.latest_timestamp()),
                Bytes("")
            )
        ),
        
        App.globalPut(
            total_verified_key,
            App.globalGet(total_verified_key) + Int(1)
        ),
        
        Return(Int(1))
    ])
    
    # Route based on application call
    program = Cond(
        [Txn.application_id() == Int(0), on_create],
        [Txn.on_completion() == OnComplete.DeleteApplication, Return(Int(0))],
        [Txn.on_completion() == OnComplete.UpdateApplication, Return(Int(0))],
        [Txn.on_completion() == OnComplete.CloseOut, Return(Int(1))],
        [Txn.on_completion() == OnComplete.OptIn, Return(Int(1))],
        [Txn.application_args[0] == Bytes("verify"), verify_asset],
        [Txn.application_args[0] == Bytes("reject"), reject_asset],
        [Txn.application_args[0] == Bytes("get_status"), get_verification],
        [Txn.application_args[0] == Bytes("update_admin"), update_admin],
        [Txn.application_args[0] == Bytes("toggle_pause"), toggle_pause],
        [Txn.application_args[0] == Bytes("bulk_verify"), bulk_verify],
    )
    
    return program


def clear_state_program():
    """Clear State Program - Always approve"""
    return Return(Int(1))


if __name__ == "__main__":
    # Compile both programs
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python asset_verification.py <approval|clear>")
        sys.exit(1)
    
    mode = sys.argv[1]
    
    if mode == "approval":
        print(compileTeal(approval_program(), mode=Mode.Application, version=8))
    elif mode == "clear":
        print(compileTeal(clear_state_program(), mode=Mode.Application, version=8))
    else:
        print("Invalid mode. Use 'approval' or 'clear'")
        sys.exit(1)
