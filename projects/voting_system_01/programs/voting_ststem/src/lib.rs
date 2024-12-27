use anchor_lang::prelude::*;

declare_id!("29mzGNdtLY8Vx8Fsb1ENV9faAJ213SBU9hMPW7b8iBE6");

#[program]
pub mod voting_system {
    use super::*;

    pub fn create_proposal(
        ctx: Context<CreateProposal>,
        title:String,
        description: String, 
        duration: i64
    ) -> Result<()>{
        let proposal = &mut ctx.accounts.proposal;
        let creator = &ctx.accounts.creator;
        let clock = Clock::get()?;

        proposal.creator = creator.key();
        proposal.title = title;
        proposal.description = description;
        proposal.votes_for = 0;
        proposal.votes_against = 0;
        proposal.ends_at = clock.unix_timestamp + duration;

        Ok(())
    }

    pub fn vote_for(ctx: Context<CreateVote>) -> Result<()> {
        let proposal = &mut ctx.accounts.proposal;
        let vote = &mut ctx.accounts.vote;
        let clock = Clock::get()?;

        if clock.unix_timestamp > proposal.ends_at {
            return err!(ErrorCode::VotingEnded);
        }

        
        vote.voter = ctx.accounts.voter.key();
        vote.proposal = proposal.key();
        vote.vote_type = true;

        proposal.votes_for += 1;

        Ok(())
    }

    pub fn vote_against(ctx: Context<CreateVote>) -> Result<()> {
        let proposal = &mut ctx.accounts.proposal;
        let vote = &mut ctx.accounts.vote;
        let clock = Clock::get()?;

        if clock.unix_timestamp > proposal.ends_at {
            return err!(ErrorCode::VotingEnded);
        }
        
        vote.voter = ctx.accounts.voter.key();
        vote.proposal = proposal.key(); 
        vote.vote_type = false;

        proposal.votes_against += 1;

        Ok(())
    }
}


#[error_code]
pub enum ErrorCode {
    #[msg("Voting has ended.")]
    VotingEnded,
    #[msg("User has already voted.")]
    AlreadyVoted,
}


#[account]
pub struct Vote {
    pub voter: Pubkey,
    pub proposal: Pubkey,
    pub vote_type: bool,
}

#[derive(Accounts)]
pub struct CreateVote<'info> {
    #[account(mut)]
    pub proposal: Account<'info, Proposal>,
    #[account(mut)]
    pub voter: Signer<'info>,
    
    #[account(
        init,
        payer = voter,
        space = 8 + 32 + 32 + 1, // discriminator + voter pubkey + proposal pubkey + bool
        seeds = [b"vote", proposal.key().as_ref(), voter.key().as_ref()],
        bump,
    )]
    pub vote: Account<'info, Vote>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(title: String, description: String)]
pub struct CreateProposal<'info> {
    #[account(
        init, 
        payer = creator,
        space = 8 + 32 + 4 + title.len() + 4 + description.len() + 8 +8 +8
    )]
    pub proposal: Account<'info, Proposal>,

    #[account(mut)]
    pub creator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct Proposal {
    pub creator: Pubkey,
    pub title: String,
    pub description: String,
    pub votes_for: u64,
    pub votes_against: u64,
    pub ends_at: i64,
}
