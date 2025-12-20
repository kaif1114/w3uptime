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
    
    if (session?.authenticated) {
      router.push(path);
      return;
    }

    
    if (isSessionLoading) {
      return;
    }

    
    await connectWithMetaMask(path);
  };

  const connectWithMetaMask = async (redirectPath?: string) => {
    setIsConnecting(true);
    setError(null);

    try {
      
      if (!window.ethereum) {
        setError('MetaMask is not installed. Please install MetaMask to continue.');
        return;
      }

      
      const authResult = await connectWallet();
      
      if (authResult?.authenticated) {
        
        queryClient.setQueryData(['session'], authResult);
        
        
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
