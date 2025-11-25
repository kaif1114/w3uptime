import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from './useSession';
import { connectWallet } from '@/lib/auth';
import { useQueryClient } from '@tanstack/react-query';

export function useLandingAuth() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { data: session, isLoading: isSessionLoading } = useSession();
  const queryClient = useQueryClient();

  const handleNavigation = async (path: string) => {
    // If user is already authenticated, navigate directly
    if (session?.authenticated) {
      router.push(path);
      return;
    }

    // If session is still loading, wait
    if (isSessionLoading) {
      return;
    }

    // User is not authenticated, try to connect MetaMask
    await connectWithMetaMask(path);
  };

  const connectWithMetaMask = async (redirectPath?: string) => {
    setIsConnecting(true);
    setError(null);

    try {
      // Check if MetaMask is installed
      if (!window.ethereum) {
        setError('MetaMask is not installed. Please install MetaMask to continue.');
        return;
      }

      // Connect wallet and authenticate
      const authResult = await connectWallet();
      
      if (authResult?.success) {
        // Update the session in the query cache
        queryClient.setQueryData(['session'], authResult);
        
        // Redirect to the intended path or default to monitors
        router.push(redirectPath || '/monitors');
      } else {
        setError(authResult?.error || 'Failed to connect with MetaMask');
      }
    } catch (err: any) {
      console.error('MetaMask connection error:', err);
      setError(err.message || 'Failed to connect with MetaMask');
    } finally {
      setIsConnecting(false);
    }
  };

  const checkMetaMaskInstalled = () => {
    return typeof window !== 'undefined' && !!window.ethereum;
  };

  const installMetaMask = () => {
    window.open('https://metamask.io/download/', '_blank');
  };

  return {
    isConnecting,
    error,
    isAuthenticated: session?.authenticated || false,
    isSessionLoading,
    handleNavigation,
    connectWithMetaMask,
    checkMetaMaskInstalled,
    installMetaMask,
    setError
  };
}
