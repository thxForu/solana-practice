use anchor_lang::prelude::*;

declare_id!("BqVGiVPq5Voh88VC6UXSGoxzi3PoHCg8hHPE8A2BRtio");

#[program]
pub mod token_deposit_01 {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
