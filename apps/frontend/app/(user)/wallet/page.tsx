import { Suspense } from 'react';
import { WalletContent } from './wallet-content';

export default function WalletPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Wallet</h1>
        <p className="text-muted-foreground">
          Manage your ETH deposits and account balance
        </p>
      </div>
      
      <Suspense fallback={<div>Loading...</div>}>
        <WalletContent />
      </Suspense>
    </div>
  );
}