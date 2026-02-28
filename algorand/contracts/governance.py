"""
Governance Smart Contract
Allows ASA holders to vote on key decisions like pausing trading, emergency actions, etc.

Features:
- Proposal creation (admin)
- Voting based on ASA holdings (weighted)
- Quorum requirements
- Time-limited proposals
- Execution of approved proposals
"""

from pyteal import *


def governance_contract():
    # Global state keys
    admin_key = Bytes("admin")
    asa_id_key = Bytes("asa_id")
    proposal_count_key = Bytes("proposal_count")
    quorum_threshold_key = Bytes("quorum")  # Percentage (e.g., 51 = 51%)
    paused_key = Bytes("paused")
    
    # Box storage patterns:
    # "prop_<id>" -> proposal_data (type, status, votes_for, votes_against, end_time, executed)
    # "vote_<prop_id>_<address>" -> vote_weight (amount of ASA held at vote time)
    
    # --- Initialization ---
    on_creation = Seq([
        App.globalPut(admin_key, Txn.sender()),
        App.globalPut(asa_id_key, Btoi(Txn.application_args[0])),
        App.globalPut(proposal_count_key, Int(0)),
        App.globalPut(quorum_threshold_key, Int(51)),  # 51% default
        App.globalPut(paused_key, Int(0)),
        Approve()
    ])
    
    # --- Helper Functions ---
    is_admin = Txn.sender() == App.globalGet(admin_key)
    is_paused = App.globalGet(paused_key) == Int(1)
    
    @Subroutine(TealType.bytes)
    def get_proposal_key(proposal_id: Expr) -> Expr:
        return Concat(Bytes("prop_"), Itob(proposal_id))
    
    @Subroutine(TealType.bytes)
    def get_vote_key(proposal_id: Expr, voter: Expr) -> Expr:
        return Concat(Bytes("vote_"), Itob(proposal_id), Bytes("_"), voter)
    
    # --- Create Proposal ---
    # Args: [b'create_proposal', proposal_type (pause|unpause|change_admin), duration_seconds, description]
    create_proposal = Seq([
        Assert(is_admin),
        Assert(Txn.application_args.length() >= Int(4)),
        
        (proposal_id := ScratchVar(TealType.uint64)),
        (end_time := ScratchVar(TealType.uint64)),
        
        # Increment proposal count
        proposal_id.store(App.globalGet(proposal_count_key) + Int(1)),
        App.globalPut(proposal_count_key, proposal_id.load()),
        
        # Calculate end time
        end_time.store(Global.latest_timestamp() + Btoi(Txn.application_args[2])),
        
        # Store proposal in box
        # Format: type(32) | status(1) | votes_for(8) | votes_against(8) | end_time(8) | executed(1) | description(rest)
        App.box_put(
            get_proposal_key(proposal_id.load()),
            Concat(
                Txn.application_args[1],  # type
                Bytes("base16", "0x00"),  # status: 0=active, 1=passed, 2=rejected
                Itob(Int(0)),  # votes_for
                Itob(Int(0)),  # votes_against
                Itob(end_time.load()),  # end_time
                Bytes("base16", "0x00"),  # executed: 0=no, 1=yes
                Txn.application_args[3]  # description
            )
        ),
        
        Log(Concat(Bytes("proposal_created:"), Itob(proposal_id.load()))),
        Approve()
    ])
    
    # --- Vote on Proposal ---
    # Args: [b'vote', proposal_id, vote (1=for, 0=against), voter_balance]
    vote = Seq([
        Assert(Not(is_paused)),
        Assert(Txn.application_args.length() == Int(4)),
        
        (proposal_id := ScratchVar(TealType.uint64)),
        (vote_choice := ScratchVar(TealType.uint64)),
        (voter_balance := ScratchVar(TealType.uint64)),
        (proposal_data := ScratchVar(TealType.bytes)),
        (end_time := ScratchVar(TealType.uint64)),
        (votes_for := ScratchVar(TealType.uint64)),
        (votes_against := ScratchVar(TealType.uint64)),
        
        proposal_id.store(Btoi(Txn.application_args[1])),
        vote_choice.store(Btoi(Txn.application_args[2])),
        voter_balance.store(Btoi(Txn.application_args[3])),
        
        # Check if already voted
        Assert(App.box_length(get_vote_key(proposal_id.load(), Txn.sender())) == Int(0)),
        
        # Get proposal data
        proposal_data.store(App.box_get(get_proposal_key(proposal_id.load()))),
        
        # Extract end_time (bytes 41-49)
        end_time.store(Btoi(Extract(proposal_data.load(), Int(41), Int(8)))),
        
        # Check if proposal is still active
        Assert(Global.latest_timestamp() < end_time.load()),
        
        # Extract current votes (bytes 33-41 for votes_for, bytes 41-49 for votes_against)
        # Actually: type(32) + status(1) + votes_for(8) + votes_against(8)
        votes_for.store(Btoi(Extract(proposal_data.load(), Int(33), Int(8)))),
        votes_against.store(Btoi(Extract(proposal_data.load(), Int(41), Int(8)))),
        
        # Update votes based on choice
        If(
            vote_choice.load() == Int(1),
            votes_for.store(votes_for.load() + voter_balance.load()),
            votes_against.store(votes_against.load() + voter_balance.load())
        ),
        
        # Record vote
        App.box_put(get_vote_key(proposal_id.load(), Txn.sender()), Itob(voter_balance.load())),
        
        # Update proposal data
        App.box_replace(
            get_proposal_key(proposal_id.load()),
            Int(33),  # Start at votes_for position
            Concat(Itob(votes_for.load()), Itob(votes_against.load()))
        ),
        
        Log(Concat(
            Bytes("vote_cast:"),
            Itob(proposal_id.load()),
            Bytes(",voter:"),
            Txn.sender(),
            Bytes(",weight:"),
            Itob(voter_balance.load())
        )),
        Approve()
    ])
    
    # --- Execute Proposal ---
    # Args: [b'execute', proposal_id, total_supply]
    execute_proposal = Seq([
        Assert(is_admin),
        Assert(Txn.application_args.length() == Int(3)),
        
        (proposal_id := ScratchVar(TealType.uint64)),
        (total_supply := ScratchVar(TealType.uint64)),
        (proposal_data := ScratchVar(TealType.bytes)),
        (end_time := ScratchVar(TealType.uint64)),
        (votes_for := ScratchVar(TealType.uint64)),
        (votes_against := ScratchVar(TealType.uint64)),
        (proposal_type := ScratchVar(TealType.bytes)),
        (quorum_needed := ScratchVar(TealType.uint64)),
        (total_votes := ScratchVar(TealType.uint64)),
        
        proposal_id.store(Btoi(Txn.application_args[1])),
        total_supply.store(Btoi(Txn.application_args[2])),
        
        # Get proposal data
        proposal_data.store(App.box_get(get_proposal_key(proposal_id.load()))),
        
        # Extract data
        proposal_type.store(Extract(proposal_data.load(), Int(0), Int(32))),
        end_time.store(Btoi(Extract(proposal_data.load(), Int(49), Int(8)))),
        votes_for.store(Btoi(Extract(proposal_data.load(), Int(33), Int(8)))),
        votes_against.store(Btoi(Extract(proposal_data.load(), Int(41), Int(8)))),
        
        # Check if voting period ended
        Assert(Global.latest_timestamp() >= end_time.load()),
        
        # Calculate quorum
        total_votes.store(votes_for.load() + votes_against.load()),
        quorum_needed.store((total_supply.load() * App.globalGet(quorum_threshold_key)) / Int(100)),
        
        # Check if quorum met and proposal passed
        Assert(total_votes.load() >= quorum_needed.load()),
        Assert(votes_for.load() > votes_against.load()),
        
        # Execute based on proposal type
        Cond(
            [proposal_type.load() == Bytes("pause"), Seq([
                App.globalPut(paused_key, Int(1)),
                Log(Bytes("contract_paused"))
            ])],
            [proposal_type.load() == Bytes("unpause"), Seq([
                App.globalPut(paused_key, Int(0)),
                Log(Bytes("contract_unpaused"))
            ])],
            # Add more proposal types as needed
        ),
        
        # Mark as executed
        App.box_replace(
            get_proposal_key(proposal_id.load()),
            Int(57),  # executed flag position
            Bytes("base16", "0x01")
        ),
        
        Approve()
    ])
    
    # --- Get Proposal ---
    get_proposal = Seq([
        Assert(Txn.application_args.length() == Int(2)),
        
        (proposal_id := ScratchVar(TealType.uint64)),
        (proposal_data := ScratchVar(TealType.bytes)),
        
        proposal_id.store(Btoi(Txn.application_args[1])),
        proposal_data.store(App.box_get(get_proposal_key(proposal_id.load()))),
        
        Log(proposal_data.load()),
        Approve()
    ])
    
    # --- Update Quorum ---
    update_quorum = Seq([
        Assert(is_admin),
        Assert(Txn.application_args.length() == Int(2)),
        App.globalPut(quorum_threshold_key, Btoi(Txn.application_args[1])),
        Approve()
    ])
    
    # --- Router ---
    router = Cond(
        [Txn.application_id() == Int(0), on_creation],
        [Txn.on_completion() == OnComplete.DeleteApplication, Return(is_admin)],
        [Txn.on_completion() == OnComplete.UpdateApplication, Return(is_admin)],
        [Txn.on_completion() == OnComplete.CloseOut, Approve()],
        [Txn.on_completion() == OnComplete.OptIn, Approve()],
        [Txn.application_args[0] == Bytes("create_proposal"), create_proposal],
        [Txn.application_args[0] == Bytes("vote"), vote],
        [Txn.application_args[0] == Bytes("execute"), execute_proposal],
        [Txn.application_args[0] == Bytes("get_proposal"), get_proposal],
        [Txn.application_args[0] == Bytes("update_quorum"), update_quorum],
    )
    
    return router


def approval_program():
    return governance_contract()


def clear_state_program():
    return Approve()


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python governance.py [approval|clear]")
        sys.exit(1)
    
    mode = sys.argv[1]
    
    if mode == "approval":
        print(compileTeal(approval_program(), mode=Mode.Application, version=8))
    elif mode == "clear":
        print(compileTeal(clear_state_program(), mode=Mode.Application, version=8))
    else:
        print(f"Unknown mode: {mode}")
        sys.exit(1)
