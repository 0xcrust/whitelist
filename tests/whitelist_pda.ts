import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { assert } from "chai";
import { WhitelistPda } from "../target/types/whitelist_pda";

describe("whitelist_pda", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.WhitelistPda as Program<WhitelistPda>;
  const authority = anchor.web3.Keypair.generate();
  const seed = "bzQgtUIrfkl";

  let configPDA: anchor.web3.PublicKey;
  let configBump: number;

  let whitelistWallets: Array<anchor.web3.Keypair> = [];
  for(let i = 0; i < 5; ++i) {
    let address = anchor.web3.Keypair.generate();
    whitelistWallets.push(address);
  }

  let nonWhitelistWallets: Array<anchor.web3.Keypair> = [];
  for(let i = 0; i < 5; ++i) {
    let address = anchor.web3.Keypair.generate();
    nonWhitelistWallets.push(address);
  }

  it("Creates a whitelist", async () => {

    // Airdrop sol to authority to pay for transactions
    const connection = provider.connection;
    const airdropSignature = await connection.requestAirdrop(authority.publicKey, 
      2 * anchor.web3.LAMPORTS_PER_SOL);
    const latestBlockHash = await connection.getLatestBlockhash();
    const tx = await connection.confirmTransaction({
      blockhash: latestBlockHash.blockhash,
      lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
      signature: airdropSignature
    });

    console.log("Airdrop to authority complete!");

    [configPDA, configBump] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from(anchor.utils.bytes.utf8.encode(seed)), authority.publicKey.toBuffer()],
      program.programId 
    );

    await program.methods
      .createWhitelist(seed)
      .accounts({
        authority: authority.publicKey,
        whitelistConfig: configPDA,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([authority])
      .rpc();

    console.log("\nStarted new whitelist!");

    const config = await program.account.config.fetch(configPDA);
    console.log(`\nconfig.authority: ${config.authority}`);
    console.log(`authority: ${authority.publicKey}`);

    assert.ok(config.authority.equals(authority.publicKey));
    assert.equal(config.counter.toNumber(), 0);

  });

  it("Adds wallets to whitelist", async () => {

    for(let i = 0; i < whitelistWallets.length; ++i) {
      let wallet = whitelistWallets[i];
      let [walletPDA, _] = await anchor.web3.PublicKey.findProgramAddress(
        [configPDA.toBuffer(), wallet.publicKey.toBuffer()],
        program.programId
      );

      await program.methods
        .addWallet(seed, wallet.publicKey)
        .accounts({
          whitelistConfig: configPDA,
          walletPda: walletPDA,
          authority: authority.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId
        })
        .signers([authority])
        .rpc();
    }

    const configState = await program.account.config.fetch(configPDA);
    console.log("counter: ", configState.counter.toNumber());

    it("Checks if a wallet is whitelisted", async () => {
      for(let i = 0; i < whitelistWallets.length; ++i) {
        let wallet = whitelistWallets[i];
        let pda = await anchor.web3.PublicKey.findProgramAddress(
          [configPDA.toBuffer(), wallet.publicKey.toBuffer()],
          program.programId
        );

        let result = 
        await program.methods
          .checkWallet(seed, wallet.publicKey)
          .accounts({
            whitelistConfig: configPDA,
            authority: authority.publicKey,
            walletPda: pda,
          })
          .signers([authority])
          .view()

      }


    });

  });
});
