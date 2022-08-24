use anchor_lang::prelude::*;

declare_id!("HqBtRNgYEFDDCiDh2jvt33MA9ZkC1hs59eQ5GLR3TfEu");

#[program]
pub mod whitelist_pda {
    use super::*;

    pub fn create_whitelist(ctx: Context<CreateWhitelist>) -> Result<()> {
        let whitelist = &mut ctx.accounts.whitelist;

        whitelist.authority = ctx.accounts.authority.key();
        whitelist.counter = 0;
        Ok(())
    }

    pub fn add_wallet(ctx: Context<AddWallet>, _wallet_address: Pubkey) -> Result<()> {
        let whitelist = &mut ctx.accounts.whitelist;
        whitelist.counter = whitelist.counter.checked_add(1).unwrap();
        Ok(())
    }

    pub fn check_wallet(_ctx: Context<CheckWallet>, _wallet_address: Pubkey) -> Result<()> {
        Ok(())
    }

    pub fn remove_wallet(ctx: Context<RemoveWallet>, _wallet_address: Pubkey) -> Result<()> {
        let whitelist = &mut ctx.accounts.whitelist;
        whitelist.counter = whitelist.counter.checked_sub(1).unwrap();
        Ok(())
    }

    pub fn set_authority(ctx: Context<SetAuthority>, new_authority: Pubkey) -> Result<()> {
        let whitelist = &mut ctx.accounts.whitelist;
        whitelist.authority = new_authority;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct CreateWhitelist<'info> {
    #[account(mut)]
    authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        space = 8 + Whitelist::LEN,
    )]
    whitelist: Account<'info, Whitelist>,
    system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(wallet_address: Pubkey)]
pub struct AddWallet<'info> {
    #[account(mut)]
    authority: Signer<'info>,
    #[account(
        mut,
        has_one = authority,
    )]
    whitelist: Account<'info, Whitelist>,
    #[account(
        init,
        seeds = [whitelist.key().as_ref(), wallet_address.as_ref()],
        bump,
        payer = authority,
        space = 8,
    )]
    wallet_pda: Account<'info, Wallet>,
    system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(wallet_address: Pubkey)]
pub struct CheckWallet<'info> {
    whitelist: Account<'info, Whitelist>,
    #[account(
        seeds = [whitelist.key().as_ref(), wallet_address.key().as_ref()],
        bump,
    )]
    wallet_pda: Account<'info, Wallet>,
}

#[derive(Accounts)]
#[instruction(wallet_address: Pubkey)]
pub struct RemoveWallet<'info> {
    #[account(mut)]
    authority: Signer<'info>,
    #[account(
        mut,
        has_one = authority,
    )]
    whitelist: Account<'info, Whitelist>,
    #[account(
        mut,
        seeds=[whitelist.key().as_ref(), wallet_address.as_ref()],
        bump,
        close = authority,
    )]
    wallet_pda: Account<'info, Wallet>,
}

#[derive(Accounts)]
pub struct SetAuthority<'info> {
    authority: Signer<'info>,
    #[account(mut, has_one = authority)]
    whitelist: Account<'info, Whitelist>,
}

#[account]
pub struct Whitelist {
    pub authority: Pubkey,
    pub counter: u64,
}

impl Whitelist {
    pub const LEN: usize = 32 + 8;
}

#[account]
pub struct Wallet {}
