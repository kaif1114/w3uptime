'use client';

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Flag, X, ChevronDown, Search, TrendingUp, TrendingDown } from "lucide-react";
import { useCountryOptions } from "@/hooks/useAnalytics";

interface CountrySelectorProps {
  selectedCountries: string[];
  onSelectionChange: (countries: string[]) => void;
  selectedContinent?: string; // Filter countries by continent
  monitorId?: string;
  maxSelections?: number;
  placeholder?: string;
  className?: string;
  showPerformanceMetrics?: boolean;
}

// Country code to flag emoji mapping (common ones)
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

export function CountrySelector({
  selectedCountries,
  onSelectionChange,
  selectedContinent,
  monitorId,
  maxSelections = 10,
  placeholder = "Select countries to analyze",
  className = "",
  showPerformanceMetrics = true,
}: CountrySelectorProps) {
  const { options, isLoading, error } = useCountryOptions(monitorId, selectedContinent);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Reset search when dropdown closes
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm("");
    }
  }, [isOpen]);

  const handleCountryToggle = (countryCode: string) => {
    if (selectedCountries.includes(countryCode)) {
      // Remove country
      onSelectionChange(selectedCountries.filter(c => c !== countryCode));
    } else if (selectedCountries.length < maxSelections) {
      // Add country
      onSelectionChange([...selectedCountries, countryCode]);
    }
  };

  const handleClearAll = () => {
    onSelectionChange([]);
  };

  const getCountryFlag = (countryCode: string) => {
    return COUNTRY_FLAGS[countryCode as keyof typeof COUNTRY_FLAGS] || '🏳️';
  };

  const formatLatency = (latency: number) => {
    return `${latency.toFixed(0)}ms`;
  };

  const formatSuccessRate = (rate: number) => {
    return `${rate.toFixed(1)}%`;
  };

  const selectedOptions = options.filter(opt => selectedCountries.includes(opt.value));
  const unselectedOptions = options.filter(opt => !selectedCountries.includes(opt.value));
  
  // Filter options based on search term
  const filteredOptions = unselectedOptions.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    option.value.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sort options by performance (best latency first)
  const sortedOptions = [...filteredOptions].sort((a, b) => {
    return a.performance.avgLatency - b.performance.avgLatency;
  });

  if (error) {
    return (
      <div className="text-sm text-destructive">
        Failed to load countries
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Flag className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm font-medium">Countries:</span>
      
      <div className="flex items-center gap-2 flex-wrap">
        {/* Selected countries as badges */}
        {selectedOptions.map((option) => (
          <Badge 
            key={option.value} 
            variant="secondary" 
            className="gap-1 pr-1"
          >
            <span>{getCountryFlag(option.value)}</span>
            <span>{option.label}</span>
            {showPerformanceMetrics && (
              <span className="text-xs text-muted-foreground">
                {formatLatency(option.performance.avgLatency)}
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0.5 hover:bg-transparent"
              onClick={() => handleCountryToggle(option.value)}
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        ))}

        {/* Country selector dropdown */}
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              size="sm"
              disabled={isLoading || selectedCountries.length >= maxSelections}
              className="gap-2"
            >
              {selectedCountries.length === 0 ? (
                <>
                  <Flag className="h-4 w-4" />
                  {placeholder}
                </>
              ) : (
                <>
                  <Flag className="h-4 w-4" />
                  Add Country
                </>
              )}
              <ChevronDown className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-96 p-0" align="start">
            <div className="p-3 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">
                  Available Countries
                  {selectedContinent && (
                    <span className="text-muted-foreground ml-1">
                      ({selectedContinent})
                    </span>
                  )}
                </h4>
                {selectedCountries.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearAll}
                    className="h-auto p-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Clear all
                  </Button>
                )}
              </div>
              
              {/* Search input */}
              {!isLoading && unselectedOptions.length > 5 && (
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search countries..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 h-8"
                  />
                </div>
              )}
              
              {isLoading ? (
                <div className="text-sm text-muted-foreground p-2">
                  Loading countries...
                </div>
              ) : sortedOptions.length === 0 ? (
                <div className="text-sm text-muted-foreground p-2">
                  {selectedCountries.length >= maxSelections 
                    ? `Maximum ${maxSelections} countries selected`
                    : searchTerm 
                      ? 'No countries found matching search'
                      : 'No more countries available'
                  }
                </div>
              ) : (
                <div className="space-y-1 max-h-72 overflow-y-auto">
                  {sortedOptions.map((option, index) => (
                    <Button
                      key={option.value}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start gap-2 h-auto p-2 hover:bg-muted"
                      onClick={() => {
                        handleCountryToggle(option.value);
                        setIsOpen(false);
                      }}
                    >
                      <span className="text-lg">{getCountryFlag(option.value)}</span>
                      <div className="flex-1 text-left">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{option.label}</span>
                          {index < 3 && (
                            <Badge variant="outline" className="text-xs">
                              {index === 0 ? 'Best' : index === 1 ? '2nd' : '3rd'}
                            </Badge>
                          )}
                        </div>
                        {showPerformanceMetrics && (
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <TrendingDown className="h-3 w-3" />
                              {formatLatency(option.performance.avgLatency)}
                            </div>
                            <div className="flex items-center gap-1">
                              <TrendingUp className="h-3 w-3" />
                              {formatSuccessRate(option.performance.successRate)}
                            </div>
                            <div>
                              {option.performance.totalChecks.toLocaleString()} checks
                            </div>
                          </div>
                        )}
                      </div>
                    </Button>
                  ))}
                </div>
              )}
              
              <div className="text-xs text-muted-foreground pt-2 border-t flex justify-between items-center">
                <span>{selectedCountries.length}/{maxSelections} countries selected</span>
                {sortedOptions.length > 0 && (
                  <span>Sorted by performance</span>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}