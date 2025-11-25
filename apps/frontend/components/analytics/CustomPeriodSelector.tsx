"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useCustomTimePeriod } from "@/hooks/useAnalytics";
import { cn } from "@/lib/utils";
import { CustomTimePeriod, EnhancedTimePeriod } from "@/types/analytics";
import { format, subDays } from "date-fns";
import { CalendarIcon, Clock } from "lucide-react";
import { useEffect, useState } from "react";

interface CustomPeriodSelectorProps {
  value: EnhancedTimePeriod | CustomTimePeriod;
  onChange: (period: EnhancedTimePeriod | CustomTimePeriod) => void;
  className?: string;
}

const PRESET_PERIODS = [
  { value: "day", label: "Last 24 Hours" },
  { value: "week", label: "Last 7 Days" },
  { value: "month", label: "Last 30 Days" },
  { value: "custom", label: "Custom Range" },
] as const;

const QUICK_RANGES = [
  { label: "Last 3 days", days: 3 },
  { label: "Last week", days: 7 },
  { label: "Last 2 weeks", days: 14 },
  { label: "Last month", days: 30 },
  { label: "Last 3 months", days: 90 },
];

export function CustomPeriodSelector({
  value,
  onChange,
  className,
}: CustomPeriodSelectorProps) {
  const { validatePeriod, createCustomPeriod } = useCustomTimePeriod();
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [tempError, setTempError] = useState<string>();

  
  useEffect(() => {
    if (typeof value === "object" && value.type === "custom") {
      setStartDate(new Date(value.startDate));
      setEndDate(new Date(value.endDate));
    }
  }, [value]);

  const currentPeriod = typeof value === "string" ? value : value.type;

  const handlePresetChange = (period: string) => {
    if (period === "custom") {
      setIsCustomOpen(true);
    } else {
      onChange(period as EnhancedTimePeriod);
      setTempError(undefined);
    }
  };

  const handleCustomRangeApply = () => {
    if (!startDate || !endDate) {
      setTempError("Please select both start and end dates");
      return;
    }

    const validation = validatePeriod(
      startDate.toISOString(),
      endDate.toISOString()
    );

    if (!validation.isValid) {
      setTempError(validation.error);
      return;
    }

    try {
      const customPeriod = createCustomPeriod(
        startDate.toISOString(),
        endDate.toISOString()
      );

      if (customPeriod) {
        onChange(customPeriod);
        setIsCustomOpen(false);
        setTempError(undefined);
      }
    } catch (error) {
      setTempError((error as Error).message);
    }
  };

  const handleQuickRange = (days: number) => {
    const end = new Date();
    const start = subDays(end, days);
    setStartDate(start);
    setEndDate(end);
    setTempError(undefined);
  };

  const formatSelectedPeriod = (): string => {
    if (typeof value === "string") {
      const preset = PRESET_PERIODS.find((p) => p.value === value);
      return preset ? preset.label : value;
    } else {
      const start = format(new Date(value.startDate), "MMM dd");
      const end = format(new Date(value.endDate), "MMM dd");
      return `${start} - ${end}`;
    }
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Clock className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm font-medium">Period:</span>

      
      <div className="flex gap-1">
        {PRESET_PERIODS.slice(0, -1).map((period) => (
          <Button
            key={period.value}
            variant={currentPeriod === period.value ? "default" : "outline"}
            size="sm"
            onClick={() => handlePresetChange(period.value)}
          >
            {period.label}
          </Button>
        ))}
      </div>

      
      <Popover open={isCustomOpen} onOpenChange={setIsCustomOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={currentPeriod === "custom" ? "default" : "outline"}
            size="sm"
            onClick={() => handlePresetChange("custom")}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {currentPeriod === "custom"
              ? formatSelectedPeriod()
              : "Custom Range"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Quick Ranges</h4>
              <div className="grid grid-cols-2 gap-2">
                {QUICK_RANGES.map((range) => (
                  <Button
                    key={range.label}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickRange(range.days)}
                  >
                    {range.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-sm">Custom Date Range</h4>

              <div className="flex gap-2">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">
                    Start Date
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-32 justify-start text-left font-normal",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "MMM dd") : "Pick date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        disabled={(date) =>
                          date > new Date() ||
                          (endDate ? date >= endDate : false)
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">
                    End Date
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-32 justify-start text-left font-normal",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "MMM dd") : "Pick date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        disabled={(date) =>
                          date > new Date() ||
                          (startDate ? date <= startDate : false)
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {tempError && (
                <div className="text-xs text-destructive">{tempError}</div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  onClick={handleCustomRangeApply}
                  disabled={!startDate || !endDate}
                >
                  Apply Range
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsCustomOpen(false);
                    setTempError(undefined);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      
      {currentPeriod === "custom" && typeof value === "object" && (
        <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
          {formatSelectedPeriod()}
        </div>
      )}
    </div>
  );
}
