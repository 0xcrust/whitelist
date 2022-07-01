use anchor_lang::prelude::*;

declare_id!("5RwKyqR6cDzFiqB5qfBsyqxzb6QuaRy249NwxJJ2154v");

#[program]
pub mod whitelist_pda {
    use super::*;

    pub fn create_whitelist(ctx: Context<CreateWhitelist>, _seed: String) -> Result<()> {
        let config = &mut ctx.accounts.whitelist_config;

        config.authority = ctx.accounts.authority.key();
        config.counter = 0;
        Ok(())
    }

    pub fn add_wallet(
        ctx: Context<AddWallet>,
        _seed: String, 
        _wallet_address: Pubkey
    ) -> Result<()> {
        let config = &mut ctx.accounts.whitelist_config;
        let wallet_pda = &mut ctx.accounts.wallet_pda;

        require!(**wallet_pda.to_account_info().try_borrow_lamports()? > 0,
                    WhitelistError::FailedWalletAddition);
        
        msg!("Wallet added to whitelist");
        config.counter = config.counter.checked_add(1).unwrap();
        Ok(())
    }

    pub fn check_wallet(
        ctx: Context<CheckWallet>,
        _seed: String,
        _wallet_address: Pubkey,
    ) -> Result<bool> {
        let wallet_pda = &mut ctx.accounts.wallet_pda;

        require!(**wallet_pda.to_account_info().try_borrow_lamports()? > 0,
                    WhitelistError::NotInWhitelist);
        
        msg!("Wallet is whitelisted!");
        Ok(true)
    }

    
    pub fn remove_wallet(
        ctx: Context<RemoveWallet>,
        _seed: String, 
        _wallet_address: Pubkey
    ) -> Result<()> {
        let config = &mut ctx.accounts.whitelist_config;
        let wallet_pda = &mut ctx.accounts.wallet_pda;

        require!(**wallet_pda.to_account_info().try_borrow_lamports()? <= 0,
                     WhitelistError::FailedWalletRemoval);

        msg!("Wallet removed from whitelist");
        config.counter = config.counter.checked_sub(1).unwrap();
        Ok(())
    }
}


#[derive(Accounts)]
#[instruction(seed: String)]
pub struct CreateWhitelist <'info> {
    #[account(mut)]
    authority: Signer<'info>,
    #[account(
        init,
        seeds = [seed.as_bytes().as_ref(), authority.key().as_ref()],
        bump,
        payer = authority,
        space = Config::LEN,
    )]
    whitelist_config: Account<'info, Config>,
    system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(seed: String, wallet_address: Pubkey)]
pub struct AddWallet<'info> {
    #[account(
        mut,
        seeds=[seed.as_bytes().as_ref(), authority.key().as_ref()],
        bump,
        has_one = authority,
    )]
    whitelist_config: Account<'info, Config>,
    #[account(
        init,
        seeds = [whitelist_config.key().as_ref(), wallet_address.as_ref()],
        bump,
        payer = authority,
        space = 8,
    )]
    wallet_pda: Account<'info, Wallet>,
    #[account(mut)]
    authority: Signer<'info>,
    system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(seed: String, wallet_address: Pubkey)]
pub struct CheckWallet<'info> {
    #[account(
        seeds = [seed.as_bytes().as_ref(), authority.key().as_ref()],
        bump,
        has_one = authority,
    )]
    whitelist_config: Account<'info, Config>,
    authority: Signer<'info>,
    #[account(
        seeds=[whitelist_config.key().as_ref(), wallet_address.as_ref()],
        bump
    )]
    wallet_pda: Account<'info, Wallet>,
}

#[derive(Accounts)]
#[instruction(seed: String, wallet_address: Pubkey)]
pub struct RemoveWallet <'info> {
    #[account(
        mut,
        seeds=[seed.as_bytes().as_ref(), authority.key().as_ref()],
        bump,
        has_one = authority,
    )]
    whitelist_config: Account<'info, Config>,
    #[account(
        mut,
        seeds=[seed.as_bytes().as_ref(), wallet_address.key().as_ref()],
        bump,
        close = authority,
    )]
    wallet_pda: Account<'info, Wallet>,
    authority: Signer<'info>
}


#[account]
pub struct Config {
    pub authority: Pubkey,
    pub counter: u64,
}

impl Config {
    const LEN: usize = 8 + 32 + 8;
}

#[account]
pub struct Wallet {}

#[error_code]
pub enum WhitelistError {
    NotInWhitelist,
    InvalidWhitelistAccount,
    FailedWalletAddition,
    FailedWalletRemoval,
}