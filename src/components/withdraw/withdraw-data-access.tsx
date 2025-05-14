'use client'

import { getLendingProgram } from '@project/anchor'
import { useConnection } from '@solana/wallet-adapter-react'
import { PublicKey, SystemProgram } from '@solana/web3.js'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import toast from 'react-hot-toast'
import { useCluster } from '../cluster/cluster-data-access'
import { useAnchorProvider } from '../solana/solana-provider'
import { useTransactionToast } from '../ui/ui-layout'
import { BN } from '@coral-xyz/anchor'
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getMint, getAssociatedTokenAddress } from '@solana/spl-token'
import { useDeposits, UserDeposit } from '../deposits/deposits-data-access'
import { useLendingProgram } from '../lending/lending-data-access'
import { useSolana } from '../solana/solana-data-access'

// Use the deployed program ID from the anchor deploy output
const LENDING_PROGRAM_ID = new PublicKey('EZqPMxDtbaQbCGMaxvXS6vGKzMTJvt7p8xCPaBT6155G');

// Move useGetTokenAccount outside to avoid the React Hook error
async function getTokenAccount(
  connection: any,
  owner: PublicKey,
  mint: PublicKey
): Promise<PublicKey | null> {
  try {
    // Get or create the user's associated token account
    const associatedTokenAddress = await getAssociatedTokenAddress(
      mint,
      owner,
      false, // Allow owner off-curve
    );
    
    return associatedTokenAddress;
  } catch (error) {
    console.error('Error getting associated token address:', error);
    return null;
  }
}

export function useWithdraw() {
  const { connection } = useConnection()
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  const provider = useAnchorProvider()
  const programId = useMemo(() => LENDING_PROGRAM_ID, [])
  const program = useMemo(() => {
    return getLendingProgram(provider, programId);
  }, [provider, programId])
  
  const { userDeposits, fetchMintInfo } = useDeposits();

  // Find specific deposit by bank ID and mint address
  const getDeposit = (bankId: string, mintAddress: string): UserDeposit | undefined => {
    if (!userDeposits.data) return undefined;
    
    return userDeposits.data.find(
      (deposit) => 
        deposit.bankPublicKey.toString() === bankId && 
        deposit.mintAddress.toString() === mintAddress
    );
  };

  // Withdraw tokens
  const withdraw = useMutation({
    mutationKey: ['withdraw', { cluster }],
    mutationFn: async ({
      bankId,
      mintAddress,
      amount,
    }: {
      bankId: string;
      mintAddress: string;
      amount: number;
    }) => {
      if (!program || !provider) {
        throw new Error('Program or provider not initialized');
      }
      
      try {
        console.log(`Withdrawing ${amount} tokens from bank ${bankId}`);
        
        // Parse public keys
        const bankPublicKey = new PublicKey(bankId);
        const mintAddress = new PublicKey(mintAddress);
        
        // Fetch deposit to get metadata
        const deposit = getDeposit(bankId, mintAddress.toString());
        if (!deposit) {
          throw new Error('No deposit found for this bank and mint address');
        }
        
        // Convert the amount to the correct format based on mint decimals
        const decimals = deposit.mintDecimals;
        const adjustedAmount = new BN(amount * Math.pow(10, decimals));
        
        // Find the PDA for the user account
        const [userAccountPDA] = PublicKey.findProgramAddressSync(
          [Buffer.from('user'), provider.publicKey.toBuffer()],
          programId
        );
        console.log('User Account PDA:', userAccountPDA.toString());
        
        // Find the PDA for the bank token account
        const [bankTokenAccountPDA] = PublicKey.findProgramAddressSync(
          [Buffer.from('treasury'), mintAddress.toBuffer()],
          programId
        );
        console.log('Bank Token Account PDA:', bankTokenAccountPDA.toString());

        // Get the user's associated token account
        const associatedTokenAddress = await getTokenAccount(connection, provider.publicKey, mintAddress);
        
        if (!associatedTokenAddress) {
          throw new Error('Unable to find or create a token account for this mint');
        }

        // Call the withdraw method
        const tx = await program.methods
          .withdraw(amount)
          .accounts({
            signer: provider.publicKey,
            mint: mintAddress,
            bank: bankPublicKey,
            bankTokenAccount: bankTokenAccountPDA,
            userAccount: userAccountPDA,
            userTokenAccount: associatedTokenAddress,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          } as any)
          .rpc({ commitment: 'confirmed' });
        
        console.log('Withdraw transaction:', tx);
        console.log('Solana Explorer URL:', `https://explorer.solana.com/tx/${tx}?cluster=devnet`);
        
        return tx;
      } catch (error) {
        console.error('Error withdrawing tokens:', error);
        
        // Handle specific error codes
        if (error instanceof Error) {
          const errorMessage = error.message;
          
          if (errorMessage.includes('insufficient funds')) {
            throw new Error('Insufficient deposit balance to complete the withdrawal.');
          } else if (errorMessage.includes('6010')) {
            throw new Error('Withdrawal amount exceeds deposit balance.');
          }
        }
        
        throw error;
      }
    },
    onSuccess: (signature) => {
      transactionToast(signature);
      
      // Refresh deposits data after successful withdrawal
      userDeposits.refetch();
    },
    onError: (error) => {
      console.error('Failed to withdraw tokens:', error);
      toast.error(`Failed to withdraw tokens: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });
  
  return {
    program,
    programId,
    withdraw,
    getDeposit,
    userDeposits,
  };
}
