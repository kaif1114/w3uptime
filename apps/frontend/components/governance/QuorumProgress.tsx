import { Progress } from '@/components/ui/progress';
import { Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface QuorumProgressProps {
  currentVoters: number;
  totalUsers: number;
  quorumThreshold?: number; // default 0.5 (50%)
  showDetails?: boolean;
}

export function QuorumProgress({
  currentVoters,
  totalUsers,
  quorumThreshold = 0.5,
  showDetails = true
}: QuorumProgressProps) {
  const participationRate = totalUsers > 0 ? (currentVoters / totalUsers) : 0;
  const participationPercent = participationRate * 100;
  const quorumMet = participationRate >= quorumThreshold;
  const requiredVoters = Math.ceil(totalUsers * quorumThreshold);
  const remainingVoters = Math.max(0, requiredVoters - currentVoters);

  return (
    <div className="space-y-2">
      {showDetails && (
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Quorum Progress</span>
            {quorumMet && (
              <Badge variant="default" className="text-xs bg-green-600 hover:bg-green-700">
                Quorum Met
              </Badge>
            )}
          </div>
          <span className="text-muted-foreground">
            {currentVoters} / {requiredVoters} voters ({participationPercent.toFixed(1)}%)
          </span>
        </div>
      )}

      <div className="relative">
        <Progress
          value={Math.min(100, participationPercent)}
          className={`h-3 ${quorumMet ? '[&>div]:bg-green-500' : ''}`}
        />

        {/* Quorum threshold indicator line */}
        <div
          className="absolute top-0 h-3 w-0.5 bg-yellow-500"
          style={{ left: `${quorumThreshold * 100}%` }}
          aria-label={`Quorum threshold at ${quorumThreshold * 100}%`}
        />
      </div>

      {showDetails && !quorumMet && (
        <p className="text-xs text-muted-foreground">
          {remainingVoters} more voter{remainingVoters !== 1 ? 's' : ''} needed to reach {quorumThreshold * 100}% quorum
        </p>
      )}
    </div>
  );
}
