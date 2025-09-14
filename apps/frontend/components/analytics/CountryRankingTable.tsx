'use client';

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Crown, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpDown, 
  Medal,
  Trophy,
  Award
} from "lucide-react";
import { AvailableCountry } from "@/types/analytics";

interface CountryRankingTableProps {
  countries: AvailableCountry[];
  title?: string;
  showTopN?: number;
  className?: string;
}

type SortField = 'performance' | 'latency' | 'uptime' | 'checks' | 'country';
type SortDirection = 'asc' | 'desc';

// Country flags mapping (subset - add more as needed)
const COUNTRY_FLAGS = {
  'US': '🇺🇸', 'GB': '🇬🇧', 'CA': '🇨🇦', 'AU': '🇦🇺', 'DE': '🇩🇪',
  'FR': '🇫🇷', 'IT': '🇮🇹', 'ES': '🇪🇸', 'NL': '🇳🇱', 'SE': '🇸🇪',
  'NO': '🇳🇴', 'DK': '🇩🇰', 'FI': '🇫🇮', 'CH': '🇨🇭', 'AT': '🇦🇹',
  'BE': '🇧🇪', 'IE': '🇮🇪', 'PT': '🇵🇹', 'BR': '🇧🇷', 'AR': '🇦🇷',
  'MX': '🇲🇽', 'JP': '🇯🇵', 'KR': '🇰🇷', 'CN': '🇨🇳', 'IN': '🇮🇳',
  'SG': '🇸🇬', 'HK': '🇭🇰', 'TW': '🇹🇼', 'TH': '🇹🇭', 'MY': '🇲🇾',
  'ID': '🇮🇩', 'PH': '🇵🇭', 'VN': '🇻🇳', 'RU': '🇷🇺', 'UA': '🇺🇦',
  'PL': '🇵🇱', 'CZ': '🇨🇿', 'HU': '🇭🇺', 'RO': '🇷🇴', 'BG': '🇧🇬',
  'GR': '🇬🇷', 'TR': '🇹🇷', 'IL': '🇮🇱', 'AE': '🇦🇪', 'SA': '🇸🇦',
  'EG': '🇪🇬', 'ZA': '🇿🇦', 'NG': '🇳🇬', 'KE': '🇰🇪', 'MA': '🇲🇦',
} as const;

export function CountryRankingTable({
  countries,
  title = "Country Performance Rankings",
  showTopN = 50,
  className = "",
}: CountryRankingTableProps) {
  const [sortField, setSortField] = useState<SortField>('performance');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [showAll, setShowAll] = useState(false);

  // Enhanced country data with performance scoring
  const enhancedCountries = useMemo(() => {
    return countries.map(country => {
      // Calculate performance score (weighted combination of latency and uptime)
      const latencyScore = Math.max(0, 100 - (country.avg_latency / 10)); // Lower latency = higher score
      const uptimeScore = country.success_rate;
      const dataReliabilityScore = Math.min(100, (country.total_checks / 100) * 10); // More data = more reliable
      
      const performanceScore = (
        uptimeScore * 0.5 +           // 50% uptime
        latencyScore * 0.35 +         // 35% latency  
        dataReliabilityScore * 0.15   // 15% data reliability
      );

      return {
        ...country,
        performance_score: Number(performanceScore.toFixed(1)),
        flag: COUNTRY_FLAGS[country.country_code as keyof typeof COUNTRY_FLAGS] || '🏳️',
      };
    });
  }, [countries]);

  // Sorted and filtered countries
  const sortedCountries = useMemo(() => {
    const sorted = [...enhancedCountries].sort((a, b) => {
      let aValue: number | string;
      let bValue: number | string;

      switch (sortField) {
        case 'performance':
          aValue = a.performance_score;
          bValue = b.performance_score;
          break;
        case 'latency':
          aValue = a.avg_latency;
          bValue = b.avg_latency;
          break;
        case 'uptime':
          aValue = a.success_rate;
          bValue = b.success_rate;
          break;
        case 'checks':
          aValue = a.total_checks;
          bValue = b.total_checks;
          break;
        case 'country':
          aValue = a.country_name;
          bValue = b.country_name;
          break;
        default:
          aValue = a.performance_score;
          bValue = b.performance_score;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortDirection === 'asc' 
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });

    return showAll ? sorted : sorted.slice(0, showTopN);
  }, [enhancedCountries, sortField, sortDirection, showAll, showTopN]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'latency' ? 'asc' : 'desc'); // Lower latency is better
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="h-4 w-4 text-yellow-500" />;
      case 2: return <Medal className="h-4 w-4 text-gray-400" />;
      case 3: return <Award className="h-4 w-4 text-amber-600" />;
      default: return <span className="text-muted-foreground">#{rank}</span>;
    }
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-blue-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead>
      <Button
        variant="ghost"
        size="sm"
        className="h-auto p-0 font-semibold"
        onClick={() => handleSort(field)}
      >
        <div className="flex items-center gap-1">
          {children}
          <ArrowUpDown className="h-3 w-3" />
        </div>
      </Button>
    </TableHead>
  );

  if (enhancedCountries.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center text-muted-foreground">
          <Trophy className="h-8 w-8 mx-auto mb-2" />
          <p>No country data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          {title}
          <Badge variant="outline">
            {sortedCountries.length} of {enhancedCountries.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Rank</TableHead>
              <SortableHeader field="country">Country</SortableHeader>
              <SortableHeader field="performance">Score</SortableHeader>
              <SortableHeader field="uptime">Uptime</SortableHeader>
              <SortableHeader field="latency">Latency</SortableHeader>
              <SortableHeader field="checks">Checks</SortableHeader>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedCountries.map((country, index) => {
              const rank = index + 1;
              return (
                <TableRow key={country.country_code}>
                  <TableCell>
                    <div className="flex items-center justify-center">
                      {getRankIcon(rank)}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{country.flag}</span>
                      <div>
                        <div className="font-medium">{country.country_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {country.country_code}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className={`font-mono font-bold ${getPerformanceColor(country.performance_score)}`}>
                        {country.performance_score}
                      </div>
                      <Progress 
                        value={country.performance_score} 
                        className="w-16 h-1" 
                      />
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{country.success_rate.toFixed(1)}%</span>
                      {country.success_rate > 99 && (
                        <TrendingUp className="h-3 w-3 text-green-500" />
                      )}
                      {country.success_rate < 95 && (
                        <TrendingDown className="h-3 w-3 text-red-500" />
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <span className="font-mono">{country.avg_latency.toFixed(0)}ms</span>
                  </TableCell>
                  
                  <TableCell>
                    <span className="text-muted-foreground">
                      {country.total_checks.toLocaleString()}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        
        {enhancedCountries.length > showTopN && !showAll && (
          <div className="mt-4 text-center">
            <Button
              variant="outline"
              onClick={() => setShowAll(true)}
            >
              Show all {enhancedCountries.length} countries
            </Button>
          </div>
        )}
        
        {showAll && (
          <div className="mt-4 text-center">
            <Button
              variant="outline"
              onClick={() => setShowAll(false)}
            >
              Show top {showTopN} only
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}