import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { TokenDeposit01 } from "../target/types/sol_and_apl_transfer_00";
import { Keypair, LAMPORTS_PER_SOL, } from "@solana/web3.js";


describe("sol_and_apl_transfer_00", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.TokenDeposit01 as Program<TokenDeposit01>;

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
});
