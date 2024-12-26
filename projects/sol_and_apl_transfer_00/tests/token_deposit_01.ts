import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolAndSplTransfer00 } from "../target/types/sol_and_spl_transfer_00";
import { Keypair, LAMPORTS_PER_SOL, } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, createMint, createAssociatedTokenAccount, mintTo, getAssociatedTokenAddress } from "@solana/spl-token";
import { assert } from "chai";

describe("sol_and_spl_transfer_00", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SolAndSplTransfer00 as Program<SolAndSplTransfer00>;

  it("transferLamports", async () => {
    const toWallet = Keypair.generate();
    const fromWallet = Keypair.generate();

    const amount = 1 * LAMPORTS_PER_SOL;

    // airdrop SOL
    const signature = await provider.connection.requestAirdrop(
      fromWallet.publicKey,
      amount
    );
    await provider.connection.confirmTransaction(signature);

    await program.methods
      .transferLamports(new anchor.BN(amount))
      .accounts({
        from: fromWallet.publicKey,
        to: toWallet.publicKey,
      }).signers([fromWallet])
      .rpc();

    const balance = await provider.connection.getBalance(toWallet.publicKey);
    console.log("New wallet balance:", balance / LAMPORTS_PER_SOL);
  });

  it("transferSplTokens", async () => {
    const fromWallet = provider.wallet as anchor.Wallet;
    const toWallet = Keypair.generate();

    const mint = await createMint(
      provider.connection,
      fromWallet.payer,
      fromWallet.publicKey,
      null,
      9
    );

    const fromAta = await createAssociatedTokenAccount(
      provider.connection,
      fromWallet.payer,
      mint,
      fromWallet.publicKey
    );

    const toAta = await createAssociatedTokenAccount(
      provider.connection,
      fromWallet.payer,
      mint,
      toWallet.publicKey
    );

    const amount = 10_000_000_000; // 10 tokens
    await mintTo(
      provider.connection,
      fromWallet.payer,
      mint,
      fromAta,
      provider.wallet.publicKey,
      amount
    );

    const fromAtaBalance = await provider.connection.getTokenAccountBalance(fromAta);
    console.log("Initial from balance:", fromAtaBalance.value.uiAmount);

    const transferAmount = amount / 2;
    await program.methods
      .transferSplTokens(new anchor.BN(transferAmount))
      .accounts({
        from: provider.wallet.publicKey,
        fromAta,
        toAta,
      })
      .rpc();

    const toAtaBalance = await provider.connection.getTokenAccountBalance(toAta);
    console.log("Final to balance:", toAtaBalance.value.uiAmount);

    assert.equal(
      toAtaBalance.value.uiAmount,
      transferAmount / (1e9),
      "Incorrect transfer amount"
    );
  });
});
