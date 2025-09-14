'use client';

import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Globe, MapPin, X, ChevronDown } from "lucide-react";
import { useContinentOptions } from "@/hooks/useAnalytics";

interface RegionSelectorProps {
  selectedRegions: string[];
  onSelectionChange: (regions: string[]) => void;
  monitorId?: string;
  maxSelections?: number;
  placeholder?: string;
  className?: string;
  showDataCount?: boolean;
}

// Continent code to name mapping
const CONTINENT_NAMES = {
  'AF': 'Africa',
  'AN': 'Antarctica', 
  'AS': 'Asia',
  'EU': 'Europe',
  'NA': 'North America',
  'OC': 'Oceania',
  'SA': 'South America',
} as const;

// Continent emojis for visual appeal
const CONTINENT_EMOJIS = {
  'AF': '🌍',
  'AN': '🧊',
  'AS': '🌏',
  'EU': '🇪🇺',
  'NA': '🌎',
  'OC': '🏝️',
  'SA': '🌎',
} as const;

export function RegionSelector({
  selectedRegions,
  onSelectionChange,
  monitorId,
  maxSelections = 5,
  placeholder = "Select continents to analyze",
  className = "",
  showDataCount = true,
}: RegionSelectorProps) {
  const { options, isLoading, error } = useContinentOptions(monitorId);
  const [isOpen, setIsOpen] = useState(false);

  const handleRegionToggle = (regionId: string) => {
    if (selectedRegions.includes(regionId)) {
      // Remove region
      onSelectionChange(selectedRegions.filter(r => r !== regionId));
    } else if (selectedRegions.length < maxSelections) {
      // Add region
      onSelectionChange([...selectedRegions, regionId]);
    }
  };

  const handleClearAll = () => {
    onSelectionChange([]);
  };

  const getRegionDisplayName = (regionId: string) => {
    return CONTINENT_NAMES[regionId as keyof typeof CONTINENT_NAMES] || regionId;
  };

  const getRegionEmoji = (regionId: string) => {
    return CONTINENT_EMOJIS[regionId as keyof typeof CONTINENT_EMOJIS] || '🌍';
  };

  const selectedOptions = options.filter(opt => selectedRegions.includes(opt.value));
  const unselectedOptions = options.filter(opt => !selectedRegions.includes(opt.value));

  if (error) {
    return (
      <div className="text-sm text-destructive">
        Failed to load regions
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Globe className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm font-medium">Regions:</span>
      
      <div className="flex items-center gap-2">
        {/* Selected regions as badges */}
        {selectedOptions.map((option) => (
          <Badge 
            key={option.value} 
            variant="secondary" 
            className="gap-1 pr-1"
          >
            <span>{getRegionEmoji(option.value)}</span>
            <span>{getRegionDisplayName(option.value)}</span>
            {showDataCount && (
              <span className="text-xs text-muted-foreground">
                ({option.dataCount})
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0.5 hover:bg-transparent"
              onClick={() => handleRegionToggle(option.value)}
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        ))}

        {/* Region selector dropdown */}
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              size="sm"
              disabled={isLoading || selectedRegions.length >= maxSelections}
              className="gap-2"
            >
              {selectedRegions.length === 0 ? (
                <>
                  <MapPin className="h-4 w-4" />
                  {placeholder}
                </>
              ) : (
                <>
                  <MapPin className="h-4 w-4" />
                  Add Region
                </>
              )}
              <ChevronDown className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="start">
            <div className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Available Regions</h4>
                {selectedRegions.length > 0 && (
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
              
              {isLoading ? (
                <div className="text-sm text-muted-foreground p-2">
                  Loading regions...
                </div>
              ) : unselectedOptions.length === 0 ? (
                <div className="text-sm text-muted-foreground p-2">
                  {selectedRegions.length >= maxSelections 
                    ? `Maximum ${maxSelections} regions selected`
                    : 'No more regions available'
                  }
                </div>
              ) : (
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {unselectedOptions
                    .sort((a, b) => b.dataCount - a.dataCount) // Sort by data count descending
                    .map((option) => (
                      <Button
                        key={option.value}
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start gap-2 h-auto p-2"
                        onClick={() => {
                          handleRegionToggle(option.value);
                          setIsOpen(false);
                        }}
                      >
                        <span className="text-lg">{getRegionEmoji(option.value)}</span>
                        <div className="flex-1 text-left">
                          <div className="font-medium">{getRegionDisplayName(option.value)}</div>
                          {showDataCount && (
                            <div className="text-xs text-muted-foreground">
                              {option.dataCount.toLocaleString()} data points
                            </div>
                          )}
                        </div>
                      </Button>
                    ))}
                </div>
              )}
              
              <div className="text-xs text-muted-foreground pt-2 border-t">
                {selectedRegions.length}/{maxSelections} regions selected
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}