'use client';

import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Shield, CheckCircle, XCircle, Clock, ExternalLink, FileText } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const onChainBadgeVariants = cva(
  'inline-flex items-center gap-1.5 font-medium transition-colors',
  {
    variants: {
      status: {
        DRAFT: 'bg-gray-100 text-gray-700 border-gray-300',
        PENDING_ONCHAIN: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        ACTIVE: 'bg-blue-100 text-blue-800 border-blue-300',
        PASSED: 'bg-green-100 text-green-800 border-green-300',
        FAILED: 'bg-red-100 text-red-800 border-red-300',
      },
      size: {
        sm: 'text-xs px-2 py-0.5 [&>svg]:h-2.5 [&>svg]:w-2.5',
        md: 'text-sm px-2.5 py-1 [&>svg]:h-3 [&>svg]:w-3',
        lg: 'text-base px-3 py-1.5 [&>svg]:h-4 [&>svg]:w-4',
      },
    },
    defaultVariants: {
      status: 'DRAFT',
      size: 'md',
    },
  }
);

type OnChainStatusType = 'DRAFT' | 'PENDING_ONCHAIN' | 'ACTIVE' | 'PASSED' | 'FAILED';

interface OnChainBadgeProps extends VariantProps<typeof onChainBadgeVariants> {
  onChainStatus: string;
  txHash?: string | null;
  className?: string;
  showEtherscanLink?: boolean;
}

const statusConfig = {
  DRAFT: {
    icon: FileText,
    label: 'Off-Chain',
    description: 'This proposal exists only in the database and has not been submitted to the blockchain.',
    color: 'gray',
  },
  PENDING_ONCHAIN: {
    icon: Clock,
    label: 'Pending...',
    description: 'Transaction submitted to blockchain. Waiting for block confirmation.',
    color: 'yellow',
  },
  ACTIVE: {
    icon: Shield,
    label: 'On-Chain Verified',
    description: 'This proposal is recorded on the Sepolia blockchain and accepting votes. All votes are permanent.',
    color: 'blue',
  },
  PASSED: {
    icon: CheckCircle,
    label: 'Passed',
    description: 'Voting has ended and this proposal has passed with 2/3+ majority (or specified threshold).',
    color: 'green',
  },
  FAILED: {
    icon: XCircle,
    label: 'Failed',
    description: 'Voting has ended and this proposal did not meet the required threshold.',
    color: 'red',
  },
};

export function OnChainBadge({
  onChainStatus,
  txHash,
  size = 'md',
  className,
  showEtherscanLink = true,
}: OnChainBadgeProps) {
  const config = statusConfig[onChainStatus as keyof typeof statusConfig] || statusConfig.DRAFT;
  const Icon = config.icon;

  const showLink = showEtherscanLink && txHash && onChainStatus !== 'DRAFT';

  const badgeContent = (
    <Badge
      variant="outline"
      className={cn(onChainBadgeVariants({ status: onChainStatus as OnChainStatusType, size }), className)}
    >
      <Icon />
      <span>{config.label}</span>
      {showLink && (
        <a
          href={`https://sepolia.etherscan.io/tx/${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()} // Prevent parent click events
          className="hover:opacity-70 transition-opacity"
          aria-label="View transaction on Etherscan"
        >
          <ExternalLink />
        </a>
      )}
    </Badge>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {badgeContent}
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <div className="space-y-1">
          <p className="text-sm font-medium">{config.label}</p>
          <p className="text-xs text-muted-foreground">{config.description}</p>
          {txHash && onChainStatus !== 'DRAFT' && (
            <p className="text-xs font-mono text-muted-foreground mt-2 pt-2 border-t">
              Tx: {txHash.slice(0, 10)}...{txHash.slice(-8)}
            </p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
