import { BN, Marinade, MarinadeConfig } from '@marinade.finance/marinade-ts-sdk';
import { Transaction } from '@solana/web3.js';
import { AppContext, EarnProvider, Opportunity, Plugin } from 'saifu';

const mSOLMintAddr = 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So';

class MarinadePlugin extends Plugin implements EarnProvider {
  id = 'marinade';

  async onload(): Promise<void> {}

  async getOpportunityWithdrawTransactions(
    ctx: AppContext,
    op: Opportunity,
    amount: number
  ): Promise<Transaction[]> {
    if (!ctx.publicKey) {
      return [];
    }

    const config = new MarinadeConfig({
      connection: ctx.connection,
      publicKey: ctx.publicKey,
    });
    const marinade = new Marinade(config);
    const unstake = await marinade.liquidUnstake(new BN(amount));

    const { blockhash } = await ctx.connection.getLatestBlockhash();
    unstake.transaction.feePayer = ctx.publicKey;
    unstake.transaction.recentBlockhash = blockhash;

    return [unstake.transaction];
  }

  async getOpportunityDepositTransactions(
    ctx: AppContext,
    _op: Opportunity,
    amount: number
  ): Promise<Transaction[]> {
    if (!ctx.publicKey) {
      return [];
    }
    const config = new MarinadeConfig({
      connection: ctx.connection,
      publicKey: ctx.publicKey,
    });
    const marinade = new Marinade(config);
    const deposit = await marinade.deposit(new BN(amount));
    const { blockhash } = await ctx.connection.getLatestBlockhash();
    deposit.transaction.feePayer = ctx.publicKey;
    deposit.transaction.recentBlockhash = blockhash;
    return [deposit.transaction];
  }

  async getOpportunities() {
    return this.fetchApy();
  }

  async getOpportunitiesForMint(ctx: AppContext, mint: string) {
    if (mint !== 'sol') {
      return [];
    }
    return this.fetchApy();
  }

  async getOpportunityBalance(ctx: AppContext) {
    if (!ctx.publicKey) {
      return 0;
    }
    const acc = ctx.tokenAccounts.find(
      (acc) => acc.mint.toLowerCase() === mSOLMintAddr.toLowerCase()
    );

    if (!acc?.amount) {
      return 0;
    }
    return Number(acc.amount);
  }

  private async fetchApy() {
    const res = await fetch('https://api.marinade.finance/msol/apy/1y');
    if (!res.ok) {
      throw new Error(res.statusText);
    }

    const marinadeRes = (await res.json()) as { value: number };
    return [
      {
        id: 'mSol',
        title: `Marinade mSOL`,
        mint: 'sol',
        rate: marinadeRes.value * 100 * 100,
      },
    ];
  }
}

export default MarinadePlugin;
