"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { WalletAddress } from "@/components/ui/WalletAddress";

interface AccountMismatchAlertProps {
  isOpen: boolean;
  sessionAddress: string;
  detectedAddress: string;
  onLogout: () => void;
  onCancel?: () => void;
}

export function AccountMismatchAlert({
  isOpen,
  sessionAddress,
  detectedAddress,
  onLogout,
  onCancel,
}: AccountMismatchAlertProps) {
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent onEscapeKeyDown={(e) => e.preventDefault()}>
        <AlertDialogHeader>
          <AlertDialogTitle>Wallet Account Changed</AlertDialogTitle>
          <AlertDialogDescription>
            You&apos;ve switched to a different MetaMask account. Please log out and
            sign in with the new account to continue.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 py-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">
              Current session:
            </p>
            <div className="rounded-md bg-muted px-3 py-2">
              <WalletAddress
                address={sessionAddress}
                showCopyButton={false}
                className="text-foreground"
              />
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">
              Detected account:
            </p>
            <div className="rounded-md bg-muted px-3 py-2">
              <WalletAddress
                address={detectedAddress}
                showCopyButton={false}
                className="text-foreground"
              />
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onLogout}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Log Out
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
