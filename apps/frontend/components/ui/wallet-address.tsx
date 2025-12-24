"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatWalletAddress, copyToClipboard } from "@/lib/WalletUtils";
import { cn } from "@/lib/utils";

interface WalletAddressProps {
  address: string;
  startChars?: number;
  endChars?: number;
  showCopyButton?: boolean;
  className?: string;
}

export function WalletAddress({
  address,
  startChars = 6,
  endChars = 4,
  showCopyButton = true,
  className,
}: WalletAddressProps) {
  const [isCopied, setIsCopied] = useState(false);

  const formattedAddress = formatWalletAddress(address, startChars, endChars);

  const handleCopy = async () => {
    const success = await copyToClipboard(address);

    if (success) {
      setIsCopied(true);
      toast.success("Address copied!");

      // Reset icon after 2 seconds
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } else {
      toast.error("Failed to copy address");
    }
  };

  if (!showCopyButton) {
    return (
      <span className={cn("font-mono text-sm", className)}>
        {formattedAddress}
      </span>
    );
  }

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <span className="font-mono text-sm">{formattedAddress}</span>
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopy}
              className="h-6 w-6"
              aria-label="Copy wallet address"
            >
              {isCopied ? (
                <Check className="h-3 w-3 text-green-500" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isCopied ? "Copied!" : "Copy address"}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
