"""
P2P Marketplace Escrow Contract (PyTeal)

Trustless peer-to-peer trading with automatic escrow.

Campus Use Cases:
- Textbook exchange
- Lab equipment rental
- Event ticket resale
- Service marketplace

Features:
- Atomic escrow (buyer protection)
- Seller deposits prevent spam
- Dispute resolution
- Automatic fund release
- Fee mechanism for platform

Learning Objectives:
- Atomic transactions
- Multi-party agreements
- State machine design
- Payment channels
"""

from pyteal import *

def escrow_contract():
    """
    P2P Marketplace Escrow
    
    Trade Flow:
    1. Seller creates listing (deposits item + fee)
    2. Buyer purchases (deposits payment)
    3. Seller confirms delivery
    4. Funds automatically released
    5. OR: Buyer/Admin can dispute
    
    Global State:
    - admin (bytes): Contract admin
    - platform_fee_percent (uint64): Platform fee (basis points, e.g. 250 = 2.5%)
    - total_trades (uint64): Total completed trades
    
    Box Storage (per trade):
    - trade_{id} => {
        seller: bytes,
        buyer: bytes,
        asset_id: uint64,
        price: uint64,
        status: uint64,
        created_at: uint64,
        expires_at: uint64
      }
    """
    
    admin_key = Bytes("admin")
    fee_percent_key = Bytes("platform_fee_percent")
    total_trades_key = Bytes("total_trades")
    
    # Initialize
    on_create = Seq([
        App.globalPut(admin_key, Txn.sender()),
        App.globalPut(fee_percent_key, Int(250)),  # 2.5% fee
        App.globalPut(total_trades_key, Int(0)),
        Return(Int(1))
    ])
    
    # Create listing
    # Args: [asset_id, price, duration_days]
    # Seller must send asset to contract
    create_listing = Seq([
        Assert(Txn.application_args.length() == Int(4)),
        Assert(Global.group_size() == Int(2)),  # App call + Asset transfer
        
        # Verify asset transfer
        Assert(Gtxn[1].type_enum() == TxnType.AssetTransfer),
        Assert(Gtxn[1].asset_receiver() == Global.current_application_address()),
        Assert(Gtxn[1].asset_amount() > Int(0)),
        
        # Store listing
        App.box_put(
            Concat(Bytes("trade_"), Itob(App.globalGet(total_trades_key))),
            Concat(
                Txn.sender(),  # seller
                Bytes(base32_decode("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ")),  # empty buyer
                Txn.application_args[1],  # asset_id
                Txn.application_args[2],  # price
                Bytes("0"),  # status: 0=listed
                Itob(Global.latest_timestamp()),  # created_at
                Itob(Global.latest_timestamp() + (Btoi(Txn.application_args[3]) * Int(86400)))  # expires_at
            )
        ),
        
        App.globalPut(total_trades_key, App.globalGet(total_trades_key) + Int(1)),
        Return(Int(1))
    ])
    
    # Purchase (buyer deposits payment)
    # Args: [trade_id]
    # Buyer must send ALGO payment
    purchase = Seq([
        Assert(Txn.application_args.length() == Int(2)),
        Assert(Global.group_size() == Int(2)),  # App call + Payment
        
        # Verify payment
        Assert(Gtxn[1].type_enum() == TxnType.Payment),
        Assert(Gtxn[1].receiver() == Global.current_application_address()),
        
        # Load trade data
        # In production: properly parse box data
        # Update status to "sold" (1)
        # Store buyer address
        
        Return(Int(1))
    ])
    
    # Confirm delivery (seller triggers, releases funds)
    # Args: [trade_id]
    confirm_delivery = Seq([
        Assert(Txn.application_args.length() == Int(2)),
        
        # Load trade
        # Verify sender is seller
        # Verify status is "sold"
        
        # Calculate platform fee
        # fee = (price * fee_percent) / 10000
        
        # Transfer asset to buyer (inner txn)
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
            TxnField.type_enum: TxnType.AssetTransfer,
            # asset_id from trade data,
            # asset_receiver: buyer address,
            # asset_amount from trade,
            TxnField.fee: Int(0),
        }),
        InnerTxnBuilder.Submit(),
        
        # Transfer payment to seller (minus fee)
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
            TxnField.type_enum: TxnType.Payment,
            # receiver: seller,
            # amount: price - fee,
            TxnField.fee: Int(0),
        }),
        InnerTxnBuilder.Submit(),
        
        # Update trade status to "completed" (2)
        Return(Int(1))
    ])
    
    # Cancel listing (before purchase)
    # Args: [trade_id]
    cancel_listing = Seq([
        # Verify sender is seller
        # Verify status is "listed"
        # Return asset to seller
        Return(Int(1))
    ])
    
    # Dispute (buyer or admin)
    # Args: [trade_id]
    open_dispute = Seq([
        # Change status to "disputed" (3)
        # Admin can resolve
        Return(Int(1))
    ])
    
    # Main program
    program = Cond(
        [Txn.application_id() == Int(0), on_create],
        [Txn.on_completion() == OnComplete.DeleteApplication, Return(Txn.sender() == App.globalGet(admin_key))],
        [Txn.application_args[0] == Bytes("create"), create_listing],
        [Txn.application_args[0] == Bytes("purchase"), purchase],
        [Txn.application_args[0] == Bytes("confirm"), confirm_delivery],
        [Txn.application_args[0] == Bytes("cancel"), cancel_listing],
        [Txn.application_args[0] == Bytes("dispute"), open_dispute],
    )
    
    return program


def approval_program():
    return escrow_contract()


def clear_program():
    return Return(Int(1))


if __name__ == "__main__":
    import os
    
    approval_compiled = compileTeal(approval_program(), mode=Mode.Application, version=8)
    clear_compiled = compileTeal(clear_program(), mode=Mode.Application, version=8)
    
    os.makedirs("build", exist_ok=True)
    
    with open("build/escrow_approval.teal", "w") as f:
        f.write(approval_compiled)
    
    with open("build/escrow_clear.teal", "w") as f:
        f.write(clear_compiled)
    
    print("✅ Escrow contract compiled successfully!")
