
"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
 ChevronDown,
  
  Menu,
  X
} from "lucide-react";
import { useState } from "react";
import { useLandingAuth } from "@/hooks/useLandingAuth";

export default function Home() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { 
    isConnecting, 
    error, 
    isAuthenticated, 
    isSessionLoading,
    handleNavigation, 
    connectWithMetaMask,
    checkMetaMaskInstalled,
    installMetaMask,
    setError
  } = useLandingAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-black-900 via-blue-900 to-gray-900">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat'
        }}></div>
      </div>
      
      {/* Header */}
      <header className="relative z-10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-black rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">W</span>
            </div>
            <span className="text-white text-xl font-semibold">W3Uptime</span>
          </div>

          {/* Desktop Navigation */}
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

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <Button 
              onClick={() => handleNavigation('/monitors')} 
              disabled={isConnecting || isSessionLoading}
              className="bg-orange-500 hover:bg-orange-600 text-white px-6"
            >
              {isConnecting ? 'Connecting...' : 'Continue with MetaMask'}
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden text-white"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
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
                  onClick={() => handleNavigation('/monitors')}
                  disabled={isConnecting || isSessionLoading}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                >
                  {isConnecting ? 'Connecting...' : 'Continue with MetaMask'}
                </Button>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Loading State */}
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

      {/* Success State */}
      {isAuthenticated && !isSessionLoading && (
        <div className="relative z-10 px-6 py-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4 mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-400 rounded-full"></div>
                <p className="text-green-400 text-sm">Welcome back! You're already connected with MetaMask.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
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

      {/* Hero Section */}
      <section className="relative z-10 px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
            The most reliable uptime monitoring.
          </h1>
          <p className="text-xl text-white/80 mb-12 max-w-2xl mx-auto">
            Get 10 monitors, 10 heartbeats and a status page with 3-minute checks totally free.
          </p>
          
          {/* CTA Form */}
          <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto mb-8">
            <Input 
              type="email" 
              placeholder="Your work e-mail" 
              className="bg-slate-800/50 border-slate-600 text-white placeholder:text-white/60 focus:border-blue-500"
            />
            <Button 
              onClick={() => handleNavigation('/monitors')}
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

      {/* Dashboard Preview */}
      <section className="relative z-10 px-6 pb-20">
        <div className="max-w-7xl mx-auto flex justify-center">
          <img 
            src="/Landing.png" 
            alt="Dashboard Preview" 
            className="max-w-full h-auto rounded-2xl shadow-2xl"
            style={{ maxWidth: '1000px', width: '100%' }}
          />
        </div>
      </section>
    </div>
  );
}
