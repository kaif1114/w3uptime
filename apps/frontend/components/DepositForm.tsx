"use client"

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ethers } from 'ethers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, Wallet, AlertCircle, CheckCircle } from 'lucide-react';
import { CONTRACT_ADDRESS, createContractInstanceWithSigner, parseDepositAmount } from 'common/contract';

const depositFormSchema = z.object({
  amount: z.string()
    .min(1, 'Amount is required')
    .refine((val) => {
      try {
        const amount = parseFloat(val);
        return amount > 0 && amount <= 10;
      } catch {
        return false;
      }
    }, 'Amount must be between 0 and 10 ETH')
});

type DepositFormData = z.infer<typeof depositFormSchema>;

interface DepositFormProps {
  onSuccess?: (transactionHash: string) => void;
  onError?: (error: string) => void;
  variant?: 'full' | 'button';
}

export function DepositForm({ onSuccess, onError, variant = 'full' }: DepositFormProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDepositing, setIsDepositing] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const form = useForm<DepositFormData>({
    // @ts-expect-error - Zod v4 compatibility issue with @hookform/resolvers v5.2.2
    resolver: zodResolver(depositFormSchema),
    defaultValues: {
      amount: ''
    }
  });

  const switchToSepolia = async () => {
    if (!window.ethereum) return false;

    try {
      
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0xaa36a7' }], 
      });
      return true;
    } catch (switchError: unknown) {
      
      if (switchError && typeof switchError === 'object' && 'code' in switchError && switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0xaa36a7',
              chainName: 'Sepolia Testnet',
              nativeCurrency: {
                name: 'SepoliaETH',
                symbol: 'SEP',
                decimals: 18,
              },
              rpcUrls: ['https://rpc.sepolia.org'],
              blockExplorerUrls: ['https://sepolia.etherscan.io/'],
            }],
          });
          return true;
        } catch (addError) {
          console.error('Failed to add Sepolia network:', addError);
          return false;
        }
      }
      console.error('Failed to switch to Sepolia:', switchError);
      return false;
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      setError('MetaMask is not installed. Please install MetaMask to continue.');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      
      const switchSuccess = await switchToSepolia();
      if (!switchSuccess) {
        setError('Please switch to Sepolia testnet to continue');
        return;
      }

      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      }) as string[];
      
      if (accounts.length > 0) {
        setWalletAddress(accounts[0]);
      } else {
        setError('No accounts found. Please connect your wallet.');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect wallet';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsConnecting(false);
    }
  };

  const onSubmit = async (data: DepositFormData) => {
    if (!walletAddress) {
      setError('Please connect your wallet first');
      return;
    }

    setIsDepositing(true);
    setError(null);
    setTransactionHash(null);

    try {
      if (!window.ethereum) {
        throw new Error('MetaMask is not available');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      
      
      if (network.chainId !== BigInt(11155111)) {
        setError('Please switch to Sepolia testnet before depositing');
        return;
      }

      const signer = await provider.getSigner();

      const contract = createContractInstanceWithSigner(signer);

      const amountInWei = parseDepositAmount(data.amount);

      const transaction = await signer.sendTransaction({
        to: CONTRACT_ADDRESS,
        value: amountInWei,
        gasLimit: BigInt(100000)
      });

      setTransactionHash(transaction.hash);

      await transaction.wait();

      onSuccess?.(transaction.hash);
      form.reset();
      setDialogOpen(false);
      
    } catch (err: unknown) {
      console.error('Deposit error:', err);
      const errorMessage = err instanceof Error ? err.message : 
                          (err && typeof err === 'object' && 'reason' in err && typeof err.reason === 'string') ? err.reason :
                          'Transaction failed';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsDepositing(false);
    }
  };

  if (variant === 'button') {
    return (
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button 
            size="lg"
            className="px-8"
          >
            Deposit
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Deposit SepoliaETH
            </DialogTitle>
            <DialogDescription>
              Deposit SepoliaETH (testnet) to your W3Uptime account to monitor websites
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {!walletAddress ? (
              <Button 
                onClick={connectWallet} 
                disabled={isConnecting}
                className="w-full"
                size="lg"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Wallet className="mr-2 h-4 w-4" />
                    Connect MetaMask
                  </>
                )}
              </Button>
            ) : (
              <div className="space-y-4">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                  </AlertDescription>
                </Alert>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount (SepoliaETH)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="0.01"
                              type="number"
                              step="0.001"
                              min="0.001"
                              max="10"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Minimum: 0.001 SepoliaETH, Maximum: 10 SepoliaETH
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      disabled={isDepositing}
                      className="w-full"
                      size="lg"
                    >
                      {isDepositing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        'Deposit SepoliaETH'
                      )}
                    </Button>
                  </form>
                </Form>
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {transactionHash && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Transaction submitted: 
                  <a 
                    href={`https://sepolia.etherscan.io/tx/${transactionHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline ml-1"
                  >
                    View on Etherscan
                  </a>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Deposit SepoliaETH
        </CardTitle>
        <CardDescription>
          Deposit SepoliaETH (testnet) to your W3Uptime account to monitor websites
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!walletAddress ? (
          <Button 
            onClick={connectWallet} 
            disabled={isConnecting}
            className="w-full"
            size="lg"
          >
            {isConnecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Wallet className="mr-2 h-4 w-4" />
                Connect MetaMask
              </>
            )}
          </Button>
        ) : (
          <div className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </AlertDescription>
            </Alert>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount (SepoliaETH)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="0.01"
                          type="number"
                          step="0.001"
                          min="0.001"
                          max="10"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Minimum: 0.001 SepoliaETH, Maximum: 10 SepoliaETH
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  disabled={isDepositing}
                  className="w-full"
                  size="lg"
                >
                  {isDepositing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Deposit SepoliaETH'
                  )}
                </Button>
              </form>
            </Form>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {transactionHash && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Transaction submitted: 
              <a 
                href={`https://sepolia.etherscan.io/tx/${transactionHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline ml-1"
              >
                View on Etherscan
              </a>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}