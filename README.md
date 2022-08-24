## Description
A program that lets other smart contracts manage access to an on-chain Solana service. It supports addition, removal of wallets to a whitelist, and grants the ability to checking if a wallet is whitelisted.
## How it works
The whitelisting contract works using pdas. When a wallet is added to the whitelist a new account with a PDA is created for it. Hence to know if a wallet is whitelisted or not all we'd to do is check if
the account that should have been created when it was added actually exists.

This program lives on the devnet at **HqBtRNgYEFDDCiDh2jvt33MA9ZkC1hs59eQ5GLR3TfEu**


## To hardcode a whitelist into your on-chain programs by CPI:
## Accounts
**authority**
The creator of the whitelist.
**whitelist_pda**
The whitelist account
**wallet_pda**
A PDA with seeds: 


- **authority**: The creator of the whitelist.
- **whitelist**: Your whitelist account. It stores details about it, such as the authority of the whitelist and the current number of whitelisted wallets.
- **wallet_pda**: A PDA with seeds: `[whitelist.key(), wallet_address.key()]`. `wallet_address` is the address of a wallet that's to be whitelisted or expected to already be.

## Instructions
```rust
pub fn create_whitelist()
```
Accounts:
- **authority**`(mut, signer)`: The whitelist authority, signer of the instruction to create a whitelist.
- **whitelist**: Your to-be-created whitelist account.
- **system_program**: The Solana system program account.

```rust
pub fn add_wallet(wallet_address: Pubkey)
```
Accounts:
- **authority**`(mut, signer)`: The whitelist authority
- **whitelist**`(mut)`: The whitelist account.
- **wallet_pda**: A `wallet_pda` account with seeds: `[whitelist.key(), wallet_address.key()]`.
- **sytem_program**: The Solana system program account.

```rust
pub fn check_wallet(wallet_address: Pubkey)
```
Accounts:
- **whitelist**: The whitelist.
- **wallet_pda**: A `wallet_pda` account with the specified seeds.

```rust
pub fn remove_wallet(wallet_address: Pubkey)
```
Accounts:
- **authority**`(mut, signer)`: The whitelist authority.
- **whitelist**`(mut)`: The whitelist account.
- **wallet_pda**`(mut)`: A `wallet_pda` account with the specified seeds.

```rust
pub fun set_authority(new_authority: Pubkey)
```
Accounts:
- **authority**`(signer)`: The whitelist authority.
- **whitelist**`(mut)`: The whitelist account.

## Requirements
- [Rust](https://www.rust-lang.org/tools/install)
- [Solana](https://docs.solana.com/cli/install-solana-cli-tools)
- [Yarn](https://yarnpkg.com/getting-started/install)
- [Anchor](https://book.anchor-lang.com/getting_started/installation.html)

View the full steps [here.](https://book.anchor-lang.com/getting_started/installation.html)

## Build and Testing
Deploy the contract to the devnet by following these steps on your cli:

#### Generate wallet
- Run ` solana-keygen new ` to create a wallet keypair
- Run ` solana airdrop 2 ` to airdrop sol to your wallet
#### Build
- Clone the repo and change into its root directory
- Run ` anchor build ` to generate a new public key for your program
- Run ` anchor keys list `. Copy the new pubkey into your declare_id!
macro at the top of `lib.rs` and replace the default key in `Anchor.toml`
- Change the `provider.cluster` variable in `Anchor.toml` to `devnet`
#### Deploy and test
- Run ` anchor deploy `
- Run ` anchor run test `








