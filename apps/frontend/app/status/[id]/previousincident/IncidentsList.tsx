'use client'
import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface MonthData {
  month: string;
  shortMonth: string;
  year: number;
  displayName: string;
  hasIncidents: boolean;
  isPast: boolean;
  isCurrent: boolean;
}


function IncidentsList() {
  const [rangeStartIndex, setRangeStartIndex] = useState<number>(0);
  
  // Constants
  const MONTHS_PER_VIEW = 3;
  
  // Static calculation of all months (1 year back + 1 year ahead)
  const getAllMonths = (): MonthData[] => {
    const months: string[] = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    const shortMonths: string[] = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    const result: MonthData[] = [];
    
    // Generate 24 months: 12 months back + 12 months ahead
    for (let i = -12; i < 12; i++) {
      const targetDate = new Date(currentYear, currentMonth + i, 1);
      const monthIndex = targetDate.getMonth();
      const yearValue = targetDate.getFullYear();
      
      const isPastMonth = i < 0;
      const isCurrentMonth = i === 0;
      
      
      result.push({
        month: months[monthIndex],
        shortMonth: shortMonths[monthIndex],
        year: yearValue,
        displayName: `${months[monthIndex]} ${yearValue}`,
        hasIncidents: false, // Static for now
        isPast: isPastMonth,
        isCurrent: isCurrentMonth
      });
    }
    
    return result;
  };
  
  const allMonths = getAllMonths();
  
  // Initialize range to show current month in the middle
  useEffect(() => {
    // Find current month index and set range to show it
    const currentMonthIndex = allMonths.findIndex(month => month.isCurrent);
    if (currentMonthIndex !== -1) {
      // Set range start to show current month in the view
      const idealStart = Math.max(0, currentMonthIndex - Math.floor(MONTHS_PER_VIEW / 2));
      setRangeStartIndex(Math.min(idealStart, allMonths.length - MONTHS_PER_VIEW));
    }
  }, []);

  // Get current view months
  const getCurrentViewMonths = (): MonthData[] => {
    const endIndex = Math.min(rangeStartIndex + MONTHS_PER_VIEW, allMonths.length);
    const viewMonths = allMonths.slice(rangeStartIndex, endIndex);
    return viewMonths.reverse(); // Show most recent first
  };
  
  // Get the range display string
  const getRangeDisplay = (months: MonthData[]): string => {
    if (months.length === 0) return '';
    const startMonth = months[months.length - 1]; // First month (reversed array)
    const endMonth = months[0]; // Last month (reversed array)
    
    return `${startMonth.shortMonth} ${startMonth.year} to ${endMonth.shortMonth} ${endMonth.year}`;
  };
  
  // Check if navigation is possible
  const canNavigate = (direction: 'prev' | 'next'): boolean => {
    if (direction === 'prev') {
      return rangeStartIndex > 0;
    } else {
      return rangeStartIndex + MONTHS_PER_VIEW < allMonths.length;
    }
  };

  const navigateRange = (direction: 'prev' | 'next'): void => {
    if (!canNavigate(direction)) return;
    
    if (direction === 'prev') {
      setRangeStartIndex(Math.max(0, rangeStartIndex - MONTHS_PER_VIEW));
    } else {
      setRangeStartIndex(Math.min(allMonths.length - MONTHS_PER_VIEW, rangeStartIndex + MONTHS_PER_VIEW));
    }
  };

  const months = getCurrentViewMonths();

  // Get status info for each month
  const getMonthStatusInfo = (monthData: MonthData) => {
    if (monthData.hasIncidents) {
      return {
        icon: <CheckCircle className="w-5 h-5 text-destructive" />,
        text: "Incidents reported",
        textColor: "text-destructive"
      };
    } else if (monthData.isCurrent) {
      return {
        icon: <CheckCircle className="w-5 h-5 text-primary" />,
        text: "Current month - No incidents reported",
        textColor: "text-primary"
      };
    
    } else {
      return {
        icon: <CheckCircle className="w-5 h-5 text-green-500" />,
        text: "No incidents reported",
        textColor: "text-muted-foreground"
      };
    }
  };

  return (
    <>
      {/* Range Navigation */}
      <div className="flex items-center justify-center gap-4 mb-8">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigateRange('prev')}
          disabled={!canNavigate('prev')}
          className="h-10 w-10"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <div className="px-6 py-2 bg-muted rounded-lg">
          <p className="text-sm font-medium text-center min-w-[200px]">
            {getRangeDisplay(months)}
          </p>
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigateRange('next')}
          disabled={!canNavigate('next')}
          className="h-10 w-10"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Month Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {months.map((monthData, index) => {
          const statusInfo = getMonthStatusInfo(monthData);
          
          return (
            <Card 
              key={`${monthData.month}-${monthData.year}-${index}`} 
              className={`shadow-sm hover:shadow-md transition-all duration-200 ${
                monthData.isCurrent ? 'ring-2 ring-primary/20 bg-primary/5 border-primary/20' : 'hover:border-primary/10'
              }`}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  {monthData.displayName}
                  {monthData.isCurrent && (
                    <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                      Current
                    </Badge>
                  )}
                   </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className={`flex items-center gap-2 ${statusInfo.textColor}`}>
                  {statusInfo.icon}
                  <span className="text-sm">{statusInfo.text}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-8 text-center">
        <p className="text-sm text-muted-foreground">
          Showing {months.length} months (1 year back to 1 year ahead from today)
        </p>
      </div>
    </>
  );
};

export default IncidentsList;

