
"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from "@/hooks/useSession";
import { connectWallet } from "@/lib/auth";
import { IconSatellite } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Menu,
  X
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Home() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    data: session,
    isLoading: isSessionLoading,
  } = useSession();

  // useEffect(() => {
  //   if (session?.authenticated) {
  //     router.push("/monitors");
  //   }
  // }, [session, router]);

  async function handleLogin() {
    setIsConnecting(true);
    setError(null);

    try {
      if (!window.ethereum) {
        setError('MetaMask is not installed. Please install MetaMask to continue.');
        return;
      }

      const verifyData = await connectWallet();
      if (verifyData) {
        queryClient.setQueryData(["session"], verifyData);
        router.push("/monitors");
      } else {
        setError('Failed to connect with MetaMask');
      }
    } catch (err: unknown) {
      console.error('MetaMask connection error:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect with MetaMask');
    } finally {
      setIsConnecting(false);
    }
  }

  function handleNavigation(path: string) {
    if (session?.authenticated) {
      router.push(path);
    } else {
      handleLogin();
    }
  }

  const checkMetaMaskInstalled = () => {
    return typeof window !== 'undefined' && !!window.ethereum;
  };

  const installMetaMask = () => {
    window.open('https://metamask.io/download/', '_blank');
  };

  const date = new Date();
  const year = date.getFullYear();
  return (
    <div className="min-h-screen bg-gradient-to-br from-black-900 via-blue-900 to-gray-900">
      {}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-30">
          <img 
            src="/blurred-shape.svg" 
            alt="" 
            className="absolute top-20 left-10 w-96 h-96 object-contain"
          />
        </div>
        <div className="absolute top-0 right-0 w-full h-full opacity-20">
          <img 
            src="/blurred-shape-gray.svg" 
            alt="" 
            className="absolute top-40 right-10 w-80 h-80 object-contain"
          />
        </div>
        <div className="absolute bottom-0 left-0 w-full h-full opacity-25">
          <img 
            src="/blurred-shape.svg" 
            alt="" 
            className="absolute bottom-20 left-20 w-72 h-72 object-contain"
          />
        </div>
      </div>
      
      {}
      <header className="relative z-10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {}
          <div className="flex items-center space-x-2">
          <IconSatellite className="!size-8" /><span className="text-white text-xl font-semibold">W3Uptime</span>
          </div>

          {}
          <nav className="hidden md:flex items-center space-x-8">
            <button 
              onClick={() => handleNavigation('/monitors')}
              className="flex items-center space-x-1 text-white/80 hover:text-white cursor-pointer"
            >
              <span>Monitors</span>
            </button>
            <button 
              onClick={() => handleNavigation('/incidents')}
              className="flex items-center space-x-1 text-white/80 hover:text-white cursor-pointer"
            >
              <span>Incidents</span>
            </button>
            <button 
              onClick={() => handleNavigation('/status-pages')}
              className="flex items-center space-x-1 text-white/80 hover:text-white cursor-pointer"
            >
              <span>Status</span>
            </button>
            <button 
              onClick={() => handleNavigation('/community')}
              className="flex items-center space-x-1 text-white/80 hover:text-white cursor-pointer"
            >
              <span>Community</span>
            </button>
          </nav>

          {}
          <div className="hidden md:flex items-center space-x-4">
            <Button 
              onClick={handleLogin} 
              disabled={isConnecting || isSessionLoading}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6"
            >
              <img src="/metamask-icon.svg" alt="MetaMask" className="w-6 h-6" />
              {isConnecting ? 'Connecting...' : 'Login with MetaMask'}
            </Button>
          </div>

          {}
          <button 
            className="md:hidden text-white"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {}
        {isMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-slate-800/95 backdrop-blur-sm border-t border-slate-700">
            <nav className="px-6 py-4 space-y-4">
              <button 
                onClick={() => handleNavigation('/monitors')}
                className="block text-white/80 hover:text-white text-left"
              >
                Monitors
              </button>
              <button 
                onClick={() => handleNavigation('/incidents')}
                className="block text-white/80 hover:text-white text-left"
              >
                Incidents
              </button>
              <button 
                onClick={() => handleNavigation('/status-pages')}
                className="block text-white/80 hover:text-white text-left"
              >
                Status
              </button>
              <button 
                onClick={() => handleNavigation('/community')}
                className="block text-white/80 hover:text-white text-left"
              >
                Community
              </button>
              <div className="pt-4 border-t border-slate-700 space-y-2">
                <Button 
                  onClick={handleLogin}
                  disabled={isConnecting || isSessionLoading}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                >
                  {isConnecting ? 'Connecting...' : 'Login with MetaMask'}
                </Button>
              </div>
            </nav>
          </div>
        )}
      </header>

      {}
      {isSessionLoading && (
        <div className="relative z-10 px-6 py-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4 mb-4">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                <p className="text-blue-400 text-sm">Checking authentication...</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="relative z-10 px-6 py-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <p className="text-red-400 text-sm">{error}</p>
                <button 
                  onClick={() => setError(null)}
                  className="text-red-400 hover:text-red-300 ml-4"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {!checkMetaMaskInstalled() && (
                <div className="mt-3">
                  <Button 
                    onClick={installMetaMask}
                    className="bg-red-500 hover:bg-red-600 text-white text-sm px-4 py-2"
                  >
                    Install MetaMask
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {}
      <section className="relative z-10 px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-blue-200 mb-6 leading-tight">
          Monitor your website&apos;s heartbeat across the globe
          </h1>
          <p className="text-xl text-white/80 mb-12 max-w-2xl mx-auto">
            Get 10 monitors, 10 heartbeats and a status page with 3-minute checks totally free. For the community, by the community.
          </p>
          
          {}
          <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto mb-8">
            <Input 
              type="email" 
              placeholder="Your work e-mail" 
              className="bg-slate-800/50 border-slate-600 text-white placeholder:text-white/60 focus:border-blue-500"
            />
            <Button 
              onClick={handleLogin}
              disabled={isConnecting || isSessionLoading}
              className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-2 whitespace-nowrap"
            >
              {isConnecting ? 'Connecting...' : 'Get started in 30 seconds'}
            </Button>
          </div>
          
          <p className="text-white/60">
            Looking for an enterprise solution?{" "}
            <Link href="/demo" className="text-white underline">
              Book a demo
            </Link>
          </p>
        </div>
      </section>

      {}
      <section className="relative z-10 px-6 pb-20">
        <div className="max-w-7xl mx-auto flex justify-center">
          <Image 
            src="/landing.png" 
            alt="Dashboard Preview" 
            className="max-w-full h-auto rounded-2xl shadow-2xl"
            style={{ maxWidth: '1000px', width: '100%' }}
            width={1000}
            height={1000}
          />
        </div>
      </section>

      {}
      <footer className="relative z-10 mt-20">
        {}
        <div className="absolute inset-0">
          <img 
            src="/footer-illustration.svg" 
            alt="" 
            className="w-full h-full object-cover"
          />
        </div>
        
        {}
        <div className="relative z-10 bg-black/40 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-6 py-16">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {}
              <div className="md:col-span-2">
                <div className="flex items-center space-x-2 mb-4">
                  <IconSatellite className="!size-8" />
                  <span className="text-white text-xl font-semibold">W3Uptime</span>
                </div>
                <p className="text-white/70 mb-6 max-w-md">
                  The most reliable uptime monitoring platform. Get 10 monitors, 10 heartbeats and a status page with 3-minute checks totally free.
                </p>
                <div className="flex space-x-4">
                  <Button 
                    onClick={handleLogin}
                    disabled={isConnecting || isSessionLoading}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-6"
                  >
                    {isConnecting ? 'Connecting...' : 'Get Started'}
                  </Button>
                  <Button 
                    variant="outline"
                    className="border-white/30 text-white hover:bg-white/10"
                  >
                    Book a Demo
                  </Button>
                </div>
              </div>

              {}
              <div>
                <h3 className="text-white font-semibold mb-4">Product</h3>
                <ul className="space-y-3">
                  <li>
                    <button 
                      onClick={() => handleNavigation('/monitors')}
                      className="text-white/70 hover:text-white transition-colors"
                    >
                      Monitors
                    </button>
                  </li>
                  <li>
                    <button 
                      onClick={() => handleNavigation('/incidents')}
                      className="text-white/70 hover:text-white transition-colors"
                    >
                      Incidents
                    </button>
                  </li>
                  <li>
                    <button 
                      onClick={() => handleNavigation('/status-pages')}
                      className="text-white/70 hover:text-white transition-colors"
                    >
                      Status Pages
                    </button>
                  </li>
                  <li>
                    <button 
                      onClick={() => handleNavigation('/community')}
                      className="text-white/70 hover:text-white transition-colors"
                    >
                      Community
                    </button>
                  </li>
                </ul>
              </div>

              {}
              <div>
                <h3 className="text-white font-semibold mb-4">Support</h3>
                <ul className="space-y-3">
                 <li>
                    <Link href="/wallet" className="text-white/70 hover:text-white transition-colors">
                      Deposit or Withdraw
                    </Link  >
                  </li>
                  <li>
                    <Link   href="/status-pages" className="text-white/70 hover:text-white transition-colors">
                      System Status
                    </Link>
                  </li>
                </ul>
              </div>
            </div>


            {}
            <div className="border-t border-white/20 mt-12 pt-8">
              <div className="flex flex-col md:flex-row justify-between items-center">
                <p className="text-white/60 text-sm">
                  {year} W3Uptime. All rights reserved.
                </p>
                <div className="flex space-x-6 mt-4 md:mt-0">
                  </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
