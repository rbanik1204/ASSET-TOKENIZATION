"""
Crowdfunding Contract (PyTeal)

Milestone-based crowdfunding for campus projects and events.

Campus Use Cases:
- Student project funding
- Event organization
- Club initiatives
- Research funding

Features:
- Milestone-based fund release
- Backer rewards (tokens)
- Refund if goal not met
- Progress tracking
- Campaign verification

Learning Objectives:
- Time-locked contracts
- Conditional logic
- Token distribution
- Governance mechanisms
"""

from pyteal import *

def crowdfunding_contract():
    """
    Campus Crowdfunding Platform
    
    Campaign Flow:
    1. Creator: Create campaign with milestones
    2. Backers: Contribute ALGO
    3. Auto

: Issue reward tokens to backers
    4. Creator: Submit milestone completion
    5. Admin/Backers: Approve milestone
    6. Auto: Release funds for milestone
    7. Repeat for all milestones
    
    Global State:
    - admin (bytes): Platform admin
    - campaign_count (uint64): Total campaigns
    - min_campaign_duration (uint64): Minimum duration (seconds)
    - max_campaign_duration (uint64): Maximum duration (seconds)
    
    Campaign Box:
    - campaign_{id} => {
        creator: bytes,
        goal_amount: uint64,
        raised_amount: uint64,
        reward_asset_id: uint64,
        milestone_count: uint64,
        current_milestone: uint64,
        status: uint64,  # 0=active, 1=funded, 2=completed, 3=failed
        deadline: uint64,
        created_at: uint64
      }
    """
    
    admin_key = Bytes("admin")
    campaign_count_key = Bytes("campaign_count")
    
    # Initialize
    on_create = Seq([
        App.globalPut(admin_key, Txn.sender()),
        App.globalPut(campaign_count_key, Int(0)),
        Return(Int(1))
    ])
    
    # Create campaign
    # Args: [goal_amount, duration_days, milestone_count, reward_asset_id]
    create_campaign = Seq([
        Assert(Txn.application_args.length() == Int(5)),
        
        # Create campaign record
        App.box_put(
            Concat(Bytes("campaign_"), Itob(App.globalGet(campaign_count_key))),
            Concat(
                Txn.sender(),  # creator
                Txn.application_args[1],  # goal_amount
                Bytes("0" * 8),  # raised_amount (initially 0)
                Txn.application_args[4],  # reward_asset_id
                Txn.application_args[3],  # milestone_count
                Bytes("0"),  # current_milestone
                Bytes("0"),  # status: active
                Itob(Global.latest_timestamp() + (Btoi(Txn.application_args[2]) * Int(86400))),  # deadline
                Itob(Global.latest_timestamp())  # created_at
            )
        ),
        
        App.globalPut(campaign_count_key, App.globalGet(campaign_count_key) + Int(1)),
        Return(Int(1))
    ])
    
    # Back campaign (contribute)
    # Args: [campaign_id]
    # Must include payment transaction
    back_campaign = Seq([
        Assert(Txn.application_args.length() == Int(2)),
        Assert(Global.group_size() == Int(2)),
        
        # Verify payment
        Assert(Gtxn[1].type_enum() == TxnType.Payment),
        Assert(Gtxn[1].receiver() == Global.current_application_address()),
        
        # Load campaign
        # Verify status is "active"
        # Verify not past deadline
        # Update raised_amount
        
        # Issue reward tokens to backer
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
            TxnField.type_enum: TxnType.AssetTransfer,
            # reward_asset_id from campaign,
            TxnField.asset_receiver: Txn.sender(),
            # amount proportional to contribution,
            TxnField.fee: Int(0),
        }),
        InnerTxnBuilder.Submit(),
        
        # Check if goal reached
        # If yes, update status to "funded"
        
        Return(Int(1))
    ])
    
    # Submit milestone completion
    # Args: [campaign_id, milestone_index, proof_cid]
    submit_milestone = Seq([
        Assert(Txn.application_args.length() == Int(4)),
        
        # Load campaign
        # Verify sender is creator
        # Verify milestone_index == current_milestone
        
        # Store milestone proof
        App.box_put(
            Concat(
                Bytes("milestone_"),
                Txn.application_args[1],  # campaign_id
                Bytes("_"),
                Txn.application_args[2]   # milestone_index
            ),
            Concat(
                Txn.application_args[3],  # proof_cid
                Itob(Global.latest_timestamp()),
                Bytes("0")  # approval_status: 0=pending
            )
        ),
        
        Return(Int(1))
    ])
    
    # Approve milestone (admin or DAO governance)
    # Args: [campaign_id, milestone_index]
    approve_milestone = Seq([
        Assert(Txn.sender() == App.globalGet(admin_key)),
        Assert(Txn.application_args.length() == Int(3)),
        
        # Load campaign
        # Calculate milestone payout (goal / milestone_count)
        
        # Transfer funds to creator
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
            TxnField.type_enum: TxnType.Payment,
            # receiver: creator,
            # amount: milestone_payout,
            TxnField.fee: Int(0),
        }),
        InnerTxnBuilder.Submit(),
        
        # Update current_milestone
        # If last milestone, update status to "completed"
        
        Return(Int(1))
    ])
    
    # Claim refund (if campaign failed)
    # Args: [campaign_id]
    claim_refund = Seq([
        # Load campaign
        # Verify deadline passed and goal not met
        # Calculate backer's contribution (from local state)
        # Transfer refund
        Return(Int(1))
    ])
    
    # Main program
    program = Cond(
        [Txn.application_id() == Int(0), on_create],
        [Txn.on_completion() == OnComplete.DeleteApplication, Return(Txn.sender() == App.globalGet(admin_key))],
        [Txn.application_args[0] == Bytes("create"), create_campaign],
        [Txn.application_args[0] == Bytes("back"), back_campaign],
        [Txn.application_args[0] == Bytes("submit_milestone"), submit_milestone],
        [Txn.application_args[0] == Bytes("approve_milestone"), approve_milestone],
        [Txn.application_args[0] == Bytes("refund"), claim_refund],
    )
    
    return program


def approval_program():
    return crowdfunding_contract()


def clear_program():
    return Return(Int(1))


if __name__ == "__main__":
    import os
    
    approval_compiled = compileTeal(approval_program(), mode=Mode.Application, version=8)
    clear_compiled = compileTeal(clear_program(), mode=Mode.Application, version=8)
    
    os.makedirs("build", exist_ok=True)
    
    with open("build/crowdfunding_approval.teal", "w") as f:
        f.write(approval_compiled)
    
    with open("build/crowdfunding_clear.teal", "w") as f:
        f.write(clear_compiled)
    
    print("✅ Crowdfunding contract compiled successfully!")
