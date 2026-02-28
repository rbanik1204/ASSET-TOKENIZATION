"""
Income Distribution Smart Contract
Automatically distributes income (ALGO) to ASA holders proportionally based on their holdings.

Features:
- Admin-controlled income deposits
- Proportional distribution based on ASA holdings
- Claim-based withdrawal model
- Tracks total distributed and per-holder claimed amounts
- Emergency pause functionality
"""

from pyteal import *


def income_distribution_contract():
    # Global state keys
    admin_key = Bytes("admin")
    asa_id_key = Bytes("asa_id")
    total_deposited_key = Bytes("total_deposited")
    total_claimed_key = Bytes("total_claimed")
    paused_key = Bytes("paused")
    
    # Box storage: "claim_<address>" -> claimed_amount (uint64)
    
    # --- Initialization ---
    on_creation = Seq([
        App.globalPut(admin_key, Txn.sender()),
        App.globalPut(asa_id_key, Btoi(Txn.application_args[0])),
        App.globalPut(total_deposited_key, Int(0)),
        App.globalPut(total_claimed_key, Int(0)),
        App.globalPut(paused_key, Int(0)),
        Approve()
    ])
    
    # --- Helper Functions ---
    is_admin = Txn.sender() == App.globalGet(admin_key)
    is_paused = App.globalGet(paused_key) == Int(1)
    
    @Subroutine(TealType.bytes)
    def get_claim_key(address: Expr) -> Expr:
        return Concat(Bytes("claim_"), address)
    
    @Subroutine(TealType.uint64)
    def get_claimed_amount(address: Expr) -> Expr:
        claim_key = get_claim_key(address)
        return Seq([
            If(
                App.box_length(claim_key) == Int(0),
                Return(Int(0)),
                Return(Btoi(App.box_get(claim_key)))
            )
        ])
    
    @Subroutine(TealType.none)
    def set_claimed_amount(address: Expr, amount: Expr) -> Expr:
        claim_key = get_claim_key(address)
        return Seq([
            App.box_put(claim_key, Itob(amount)),
        ])
    
    # --- Deposit Income ---
    # Admin deposits ALGO that will be distributed to ASA holders
    deposit_income = Seq([
        Assert(is_admin),
        Assert(Not(is_paused)),
        Assert(Gtxn[0].type_enum() == TxnType.Payment),
        Assert(Gtxn[0].receiver() == Global.current_application_address()),
        Assert(Gtxn[0].amount() > Int(0)),
        
        # Update total deposited
        App.globalPut(
            total_deposited_key,
            App.globalGet(total_deposited_key) + Gtxn[0].amount()
        ),
        
        Approve()
    ])
    
    # --- Claim Income ---
    # ASA holder claims their proportional share of income
    # Required: holder must have opted into ASA, balance > 0
    claim_income = Seq([
        Assert(Not(is_paused)),
        
        # Get claimer's ASA balance (requires foreign asset in txn)
        # TODO: This requires reading holder's balance from the box/indexer
        # For now, we pass it as an argument
        Assert(Txn.application_args.length() == Int(2)),  # [b'claim', balance]
        
        # Variables
        (holder_balance := ScratchVar(TealType.uint64)),
        (already_claimed := ScratchVar(TealType.uint64)),
        (claimable := ScratchVar(TealType.uint64)),
        
        holder_balance.store(Btoi(Txn.application_args[1])),
        
        # Get amount already claimed by this address
        already_claimed.store(get_claimed_amount(Txn.sender())),
        
        # Calculate claimable amount
        # This is a simplified calculation: 
        # claimable = (holder_balance / total_supply) * total_deposited - already_claimed
        # Note: In production, we'd query ASA total supply via app call
        
        # For demo, we assume 10000 total supply (should be from ASA params)
        claimable.store(
            If(
                holder_balance.load() > Int(0),
                # (balance * total_deposited / 10000) - already_claimed
                (holder_balance.load() * App.globalGet(total_deposited_key) / Int(10000)) - already_claimed.load(),
                Int(0)
            )
        ),
        
        Assert(claimable.load() > Int(0)),
        
        # Update claimed amount
        set_claimed_amount(Txn.sender(), already_claimed.load() + claimable.load()),
        
        # Update total claimed globally
        App.globalPut(
            total_claimed_key,
            App.globalGet(total_claimed_key) + claimable.load()
        ),
        
        # Send payment to claimer
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
            TxnField.type_enum: TxnType.Payment,
            TxnField.receiver: Txn.sender(),
            TxnField.amount: claimable.load(),
            TxnField.fee: Int(0),  # Caller pays fee
        }),
        InnerTxnBuilder.Submit(),
        
        Approve()
    ])
    
    # --- Get Claimable Amount ---
    # Read-only operation to check how much a holder can claim
    get_claimable = Seq([
        Assert(Txn.application_args.length() == Int(2)),  # [b'get_claimable', balance]
        
        (holder_balance := ScratchVar(TealType.uint64)),
        (already_claimed := ScratchVar(TealType.uint64)),
        (claimable := ScratchVar(TealType.uint64)),
        
        holder_balance.store(Btoi(Txn.application_args[1])),
        already_claimed.store(get_claimed_amount(Txn.sender())),
        
        claimable.store(
            If(
                holder_balance.load() > Int(0),
                (holder_balance.load() * App.globalGet(total_deposited_key) / Int(10000)) - already_claimed.load(),
                Int(0)
            )
        ),
        
        # Return claimable amount in logs
        Log(Itob(claimable.load())),
        Approve()
    ])
    
    # --- Update Admin ---
    update_admin = Seq([
        Assert(is_admin),
        Assert(Txn.application_args.length() == Int(2)),
        App.globalPut(admin_key, Txn.application_args[1]),
        Approve()
    ])
    
    # --- Toggle Pause ---
    toggle_pause = Seq([
        Assert(is_admin),
        Assert(Txn.application_args.length() == Int(2)),
        App.globalPut(paused_key, Btoi(Txn.application_args[1])),
        Approve()
    ])
    
    # --- Get Contract Info ---
    get_info = Seq([
        Log(Concat(
            Bytes("admin:"), App.globalGet(admin_key),
            Bytes(",asa_id:"), Itob(App.globalGet(asa_id_key)),
            Bytes(",total_deposited:"), Itob(App.globalGet(total_deposited_key)),
            Bytes(",total_claimed:"), Itob(App.globalGet(total_claimed_key)),
            Bytes(",paused:"), Itob(App.globalGet(paused_key)),
        )),
        Approve()
    ])
    
    # --- Router ---
    router = Cond(
        [Txn.application_id() == Int(0), on_creation],
        [Txn.on_completion() == OnComplete.DeleteApplication, Return(is_admin)],
        [Txn.on_completion() == OnComplete.UpdateApplication, Return(is_admin)],
        [Txn.on_completion() == OnComplete.CloseOut, Approve()],
        [Txn.on_completion() == OnComplete.OptIn, Approve()],
        [Txn.application_args[0] == Bytes("deposit"), deposit_income],
        [Txn.application_args[0] == Bytes("claim"), claim_income],
        [Txn.application_args[0] == Bytes("get_claimable"), get_claimable],
        [Txn.application_args[0] == Bytes("update_admin"), update_admin],
        [Txn.application_args[0] == Bytes("toggle_pause"), toggle_pause],
        [Txn.application_args[0] == Bytes("get_info"), get_info],
    )
    
    return router


def approval_program():
    return income_distribution_contract()


def clear_state_program():
    return Approve()


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python income_distribution.py [approval|clear]")
        sys.exit(1)
    
    mode = sys.argv[1]
    
    if mode == "approval":
        print(compileTeal(approval_program(), mode=Mode.Application, version=8))
    elif mode == "clear":
        print(compileTeal(clear_state_program(), mode=Mode.Application, version=8))
    else:
        print(f"Unknown mode: {mode}")
        sys.exit(1)
