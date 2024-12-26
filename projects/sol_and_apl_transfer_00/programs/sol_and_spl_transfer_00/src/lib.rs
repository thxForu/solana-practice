use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token};

declare_id!("BqVGiVPq5Voh88VC6UXSGoxzi3PoHCg8hHPE8A2BRtio");

#[program]
pub mod sol_and_spl_transfer_00 {
    use super::*;
    use anchor_lang::solana_program::system_instruction;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }

    pub fn transfer_lamports(ctx: Context<TransferLamports>, amount: u64) -> Result<()> {
        let from_account = &ctx.accounts.from;
        let to_account = &ctx.accounts.to;

        let transfer_instruction =
            system_instruction::transfer(from_account.key, to_account.key, amount);

        anchor_lang::solana_program::program::invoke_signed(
            &transfer_instruction,
            &[
                from_account.to_account_info(),
                to_account.clone(),
                ctx.accounts.system_program.to_account_info(),
            ],
            &[],
        )?;

        Ok(())
    }

    pub fn transfer_spl_tokens(ctx: Context<TransferSpl>, amount: u64) -> Result<()> {
        let transfer_instruction = token::Transfer {
            from: ctx.accounts.from_ata.to_account_info(),
            to: ctx.accounts.to_ata.to_account_info(),
            authority: ctx.accounts.from.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            transfer_instruction,
        );

        token::transfer(cpi_ctx, amount)?;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct TransferSpl<'info> {
    pub from: Signer<'info>,
    #[account(mut)]
    /// CHECK: This is a token account
    pub from_ata: UncheckedAccount<'info>,
    #[account(mut)]
    /// CHECK: This is a token account.
    pub to_ata: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Initialize {}

#[derive(Accounts)]
pub struct TransferLamports<'info> {
    #[account(mut)]
    pub from: Signer<'info>,
    #[account(mut)]
    /// CHECK: This is safe because we're just transferring SOL
    pub to: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}
