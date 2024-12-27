import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { VotingSystem } from "../target/types/voting_system";
import { expect } from "chai";

describe("voting_system", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  const program = anchor.workspace.VotingSystem as Program<VotingSystem>;

  before(() => {
    anchor.setProvider(provider);
  });

  async function createProposal(
    title: string = "Test Proposal",
    description: string = "Test Description",
    duration: number = 24 * 60 * 60
  ) {
    const proposalKeypair = anchor.web3.Keypair.generate();

    await program.methods
      .createProposal(title, description, new anchor.BN(duration))
      .accounts({
        proposal: proposalKeypair.publicKey,
        creator: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([proposalKeypair])
      .rpc();

    return proposalKeypair;
  }

  it("Creates a proposal", async () => {
    try {
      const proposalKeypair = await createProposal();

      const proposalAccount = await program.account.proposal.fetch(
        proposalKeypair.publicKey
      );

      expect(proposalAccount.title).to.equal("Test Proposal");
      expect(proposalAccount.description).to.equal("Test Description");
      expect(proposalAccount.votesFor.toNumber()).to.equal(0);
      expect(proposalAccount.votesAgainst.toNumber()).to.equal(0);

    } catch (error) {
      console.error("Error:", error);
      throw error;
    }
  });

  async function createVoteAccount(
    proposalPublicKey: anchor.web3.PublicKey,
    voterPublicKey: anchor.web3.PublicKey
  ) {
    return anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("vote"),
        proposalPublicKey.toBuffer(),
        voterPublicKey.toBuffer(),
      ],
      program.programId
    )[0];
  }

  it("Cat vote for a proposal", async () => {
    const proposalKeypair = await createProposal();

    const voteAccount = await createVoteAccount(
      proposalKeypair.publicKey,
      provider.wallet.publicKey
    );

    await program.methods.voteFor().accounts({
      proposal: proposalKeypair.publicKey,
      vote: voteAccount,
      voter: provider.wallet.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    }).rpc();

    const proposalAccount = await program.account.proposal.fetch(
      proposalKeypair.publicKey
    );
    expect(proposalAccount.votesFor.toNumber()).to.equal(1);
  });

  it("Cannot vote after deadline", async () => {
    const proposalKeypair = await createProposal(
      "Quick vote",
      "Test",
      0.1 // 0.1 sec 
    );

    await new Promise(resolve => setTimeout(resolve, 1000));

    const voteAccount = await createVoteAccount(
      proposalKeypair.publicKey,
      provider.wallet.publicKey
    );

    try {
      await program.methods
        .voteFor()
        .accounts({
          proposal: proposalKeypair.publicKey,
          voter: provider.wallet.publicKey,
          vote: voteAccount,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      assert.fail("Should have thrown an error");
    } catch (error) {
      expect(error.message).to.include("Voting has ended");
    }
  });

  it("Can vote against a proposal", async () => {
    const proposalKeypair = await createProposal();

    const voteAccount = await createVoteAccount(
      proposalKeypair.publicKey,
      provider.wallet.publicKey
    );

    await program.methods.voteAgainst().accounts({
      proposal: proposalKeypair.publicKey,
      vote: voteAccount,
      voter: provider.wallet.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    }).rpc();

    const proposalAccount = await program.account.proposal.fetch(
      proposalKeypair.publicKey
    );
    expect(proposalAccount.votesAgainst.toNumber()).to.equal(1);
    expect(proposalAccount.votesFor.toNumber()).to.equal(0);
  });

  it("Cannot vote twice on the same proposal", async () => {
    const proposalKeypair = await createProposal();
    const voteAccount = await createVoteAccount(
      proposalKeypair.publicKey,
      provider.wallet.publicKey
    );

    await program.methods.voteAgainst().accounts({
      proposal: proposalKeypair.publicKey,
      vote: voteAccount,
      voter: provider.wallet.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    }).rpc();

    try {
      // try to vote again
      await program.methods.voteAgainst().accounts({
        proposal: proposalKeypair.publicKey,
        vote: voteAccount,
        voter: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      }).rpc();

      assert.fail("Should have thrown an error");
    } catch (error) {
      expect(error.message).to.include("already in use");
    }
  });
});
