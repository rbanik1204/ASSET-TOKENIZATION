"""Check account balance and verify mnemonic"""
from algosdk.v2client import algod
from algosdk import mnemonic

# Check balance
address = "CZBNQWHGVNNRRMSDTJPZVFGQY6QDEVGVTAX77H745WJAKQCZAHPJJ7HE6A"
client = algod.AlgodClient('', 'https://testnet-api.algonode.cloud')

try:
    info = client.account_info(address)
    balance = info['amount'] / 1_000_000
    print(f"✅ Account found!")
    print(f"Address: {address}")
    print(f"Balance: {balance} ALGO")
except Exception as e:
    print(f"❌ Error: {e}")

# Verify mnemonic word count
test_mnemonic = "dice naive industry poet dash laundry exact chef tuna caution legal pipe indicate melt judge envelope chaos surround code embody drill wealth salt drip"
words = test_mnemonic.strip().split()
print(f"\n⚠️  Mnemonic word count: {len(words)}")
print(f"Words: {words}")
print(f"\n❌ Algorand mnemonics must be exactly 25 words!")
print(f"You are missing {25 - len(words)} word(s).")
print(f"\nPlease check your wallet backup or generate a new account.")
