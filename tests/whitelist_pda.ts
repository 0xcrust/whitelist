import * as anchor from "@project-serum/anchor";
import { AnchorError, Program } from "@project-serum/anchor";
import { assert, expect } from "chai";
import chai from "chai";
import { WhitelistPda } from "../target/types/whitelist_pda";
import { findProgramAddressSync } from "@project-serum/anchor/dist/cjs/utils/pubkey";

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

    let config = await program.account.config.fetch(configPDA);

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

    let config = await program.account.config.fetch(configPDA);
    assert.equal(config.counter.toNumber(), 5);

    // Tests adding a wallet that has already been added
    let duplicateWallet = whitelistWallets[2];
    let [duplicateWalletPDA, _] = await anchor.web3.PublicKey.findProgramAddress(
      [configPDA.toBuffer(), duplicateWallet.publicKey.toBuffer()],
      program.programId
    );

    try {
      await program.methods
      .addWallet(seed, duplicateWallet.publicKey)
      .accounts({
        whitelistConfig: configPDA,
        walletPda: duplicateWalletPDA,
        authority: authority.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId 
      })
      .signers([authority])
      .rpc();
      chai.assert(false, "Should fail due to PDA already being initialized");
    } catch(_err) {
      assert.equal(_err.message, "failed to send transaction: Transaction simulation failed: Error processing Instruction 0: custom program error: 0x0");
    }

    assert.equal(config.counter.toNumber(), 5);
  });


  it("Checks if wallets are whitelisted", async () => {
    // Tests checking a valid whitelisted wallet
    let whitelistedWallet = whitelistWallets[0];
    let [whitelistedWalletPDA, bump] = await anchor.web3.PublicKey.findProgramAddress(
      [configPDA.toBuffer(), whitelistedWallet.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .checkWallet(seed, whitelistedWallet.publicKey)
      .accounts({
        whitelistConfig: configPDA,
        authority: authority.publicKey,
        walletPda: whitelistedWalletPDA,
      })
      .signers([authority])
      .rpc();
    chai.assert(true);

    // Tests checking a non-whitelisted wallet
    let nonWhitelistedWallet = anchor.web3.Keypair.generate();
    let [nonWhitelistedWalletPDA, _] = await anchor.web3.PublicKey.findProgramAddress(
      [configPDA.toBuffer(), nonWhitelistedWallet.publicKey.toBuffer()],
      program.programId
    ); 

    try {
      await program.methods
      .checkWallet(seed, nonWhitelistedWallet.publicKey)
      .accounts({
        whitelistConfig: configPDA,
        authority: authority.publicKey,
        walletPda: nonWhitelistedWalletPDA,
      })
      .signers([authority])
      .rpc();
    chai.assert(false, "Should fail due to wallet not being whitelisted");
    } catch(_err) {
      expect(_err).to.be.instanceOf(AnchorError);
      const err: AnchorError = _err;
      expect(err.error.errorCode.code).to.equal("WalletNotWhitelisted");
      expect(err.error.errorCode.number).to.equal(6000);
      expect(err.error.errorMessage).to.equal("Wallet is not in whitelist");
      expect(err.program.equals(program.programId)).is.true;
    }


    // Tests passing a wallet in the instruction that doesn't match the wallet seed for the PDA in accounts
    let randomWallet = anchor.web3.Keypair.generate();
    try {
      await program.methods
      .checkWallet(seed, randomWallet.publicKey)
      .accounts({
        whitelistConfig: configPDA,
        authority: authority.publicKey,
        walletPda: nonWhitelistedWalletPDA,
      })
      .signers([authority])
      .rpc();
    chai.assert(false, "Should fail due to wallet not being whitelisted");
    } catch(_err) {
      expect(_err).to.be.instanceOf(AnchorError);
      const err: AnchorError = _err;
      expect(err.error.errorCode.code).to.equal("NonMatchingPDAs");
      expect(err.error.errorCode.number).to.equal(6001);
      expect(err.error.errorMessage).to.equal("PDA derived from address argument does not match that in argument");
      expect(err.program.equals(program.programId)).is.true;
    }
  });


  it("Removes wallets from whitelist", async () => {
    // Tests deleting whitelisted wallets.
    // Deletes 2nd, 3rd and 4th entries of whitelist addresses from whitelist
    for(let i = 1; i < 4; ++i) {
      let walletToRemove = whitelistWallets[i];

      let [removeWalletPDA, bump] = await anchor.web3.PublicKey.findProgramAddress(
        [configPDA.toBuffer(), walletToRemove.publicKey.toBuffer()],
        program.programId
      );
  
      await program.methods
        .removeWallet(seed, walletToRemove.publicKey, bump)
        .accounts({
          whitelistConfig: configPDA,
          walletPda: removeWalletPDA,
          authority: authority.publicKey,
        })
        .signers([authority])
        .rpc();
    }

    // Checks that 2nd, 3rd and 4th wallets were indeed removed
    for(let i = 1; i < 4; ++ i) {

      try {
        let wallet = whitelistWallets[i];

        let [walletPDA, bump] = await anchor.web3.PublicKey.findProgramAddress(
          [configPDA.toBuffer(), wallet.publicKey.toBuffer()],
          program.programId
        );
  
        await program.methods
        .checkWallet(seed, wallet.publicKey)
        .accounts({
          whitelistConfig: configPDA,
          authority: authority.publicKey,
          walletPda: walletPDA,
        })
        .signers([authority])
        .rpc();
        chai.assert(false);
      } catch(_err) {
        expect(_err).to.be.instanceOf(AnchorError);
        const err: AnchorError = _err;
        expect(err.error.errorCode.code).to.equal("WalletNotWhitelisted");
        expect(err.error.errorCode.number).to.equal(6000);
        expect(err.error.errorMessage).to.equal("Wallet is not in whitelist")
        expect(err.program.equals(program.programId)).is.true;
      }
    }

    let config = await program.account.config.fetch(configPDA); 
    assert.equal(config.counter.toNumber(), 2);

    
    // Tests deleting an already deleted wallet
    let removedWallet = whitelistWallets[2];
    let [removedWalletPDA, removedBump] = await anchor.web3.PublicKey.findProgramAddress(
      [configPDA.toBuffer(), removedWallet.publicKey.toBuffer()],
      program.programId
    );

    try {
      await program.methods
      .removeWallet(seed, removedWallet.publicKey, removedBump)
      .accounts({
        whitelistConfig: configPDA,
        walletPda: removedWalletPDA,
        authority: authority.publicKey,
      })
      .signers([authority])
      .rpc();
      chai.assert(false, "Should fail. Can't remove a non-whitelisted wallet");
    } catch(_err) {
      expect(_err).to.be.instanceOf(AnchorError);
      const err: AnchorError = _err;
      expect(err.error.errorCode.code).to.equal("AccountNotInitialized");
      expect(err.error.errorCode.number).to.equal(3012);
      expect(err.program.equals(program.programId)).is.true;
    }
    assert.equal(config.counter.toNumber(), 2);

    // Tests deleting a wallet that never was whitelisted
    let neverWhitelisted = anchor.web3.Keypair.generate();
    let [neverWhitelistedPDA, neverBump] = await anchor.web3.PublicKey.findProgramAddress(
      [configPDA.toBuffer(), neverWhitelisted.publicKey.toBuffer()],
      program.programId
    );

    try {
      await program.methods
      .removeWallet(seed, neverWhitelisted.publicKey, neverBump)
      .accounts({
        whitelistConfig: configPDA,
        walletPda: neverWhitelistedPDA,
        authority: authority.publicKey,
      })
      .signers([authority])
      .rpc();
      chai.assert(false, "Should fail. Can't remove a non-whitelisted wallet");
    } catch(_err) {
      expect(_err).to.be.instanceOf(AnchorError);
      const err: AnchorError = _err;
      expect(err.error.errorCode.code).to.equal("AccountNotInitialized");
      expect(err.error.errorCode.number).to.equal(3012);
      expect(err.program.equals(program.programId)).is.true;
    }
    assert.equal(config.counter.toNumber(), 2);
  });

});
