### Wallet Whitelisting Contract
## Description
A smart contract written to replicate the concept of a whitelist, that is a gating tool for determining which users are granted access to a particular service. It supports addition, removal and checking of wallets.


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
- Run ` anchor keys list ` .Copy the new pubkey into your declare_id!
macro at the top of `lib.rs` and replace the default key in `Anchor.toml`
- Change the `provider.cluster` variable in `Anchor.toml` to `devnet`
#### Deploy and test
- Run ` anchor deploy `
- Run ` anchor run test `








