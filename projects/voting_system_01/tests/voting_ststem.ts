import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { VotingSystem } from "../target/types/voting_system";
import { expect } from "chai";

describe("voting_system", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  const program = anchor.workspace.VotingStstem as Program<VotingSystem>;

  before(() => {
    anchor.setProvider(provider);
  });

  it("Creates a proposal", async () => {
    const proposalKeypair = anchor.web3.Keypair.generate();

    const title = "First Proposal";
    const description = "This is a test proposal";
    const duration = 24 * 60 * 60;

    try {
      await program.methods
        .createProposal(title, description, new anchor.BN(duration))
        .accounts({
          proposal: proposalKeypair.publicKey,
          creator: provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([proposalKeypair])
        .rpc();

      const proposalAccount = await program.account.proposal.fetch(
        proposalKeypair.publicKey
      );

      expect(proposalAccount.title).to.equal(title);
      expect(proposalAccount.description).to.equal(description);
      expect(proposalAccount.votesFor.toNumber()).to.equal(0);
      expect(proposalAccount.votesAgainst.toNumber()).to.equal(0);
      expect(proposalAccount.creator.toBase58()).to.equal(
        provider.wallet.publicKey.toBase58()
      );

      const now = Math.floor(Date.now() / 1000);
      expect(proposalAccount.endsAt.toNumber()).to.be.approximately(
        now + duration,
        5
      );

    } catch (error) {
      console.error("Error:", error);
      throw error;
    }
  });
});
