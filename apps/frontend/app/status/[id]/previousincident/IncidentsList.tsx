'use client'
import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { IncidentsListSkeleton } from '@/components/skeletons/StatusPageSkeletons';

interface MonthData {
  month: string;
  shortMonth: string;
  year: number;
  displayName: string;
  hasIncidents: boolean;
  isPast: boolean;
  isCurrent: boolean;
  incidentCount?: number;
}

interface IncidentsListProps {
  statusPageId: string;
}

function IncidentsList({ statusPageId }: IncidentsListProps) {
  const [rangeStartIndex, setRangeStartIndex] = useState<number>(0);
  const [monthsWithIncidents, setMonthsWithIncidents] = useState<Map<string, number>>(new Map());
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  
  
  const MONTHS_PER_VIEW = 3;
  
  
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
    
    
    for (let i = -12; i < 12; i++) {
      const targetDate = new Date(currentYear, currentMonth + i, 1);
      const monthIndex = targetDate.getMonth();
      const yearValue = targetDate.getFullYear();
      
      const isPastMonth = i < 0;
      const isCurrentMonth = i === 0;
      
      const monthKey = `${yearValue}-${monthIndex + 1}`;
      const incidentCount = monthsWithIncidents.get(monthKey) || 0;
      
      result.push({
        month: months[monthIndex],
        shortMonth: shortMonths[monthIndex],
        year: yearValue,
        displayName: `${months[monthIndex]} ${yearValue}`,
        hasIncidents: incidentCount > 0,
        isPast: isPastMonth,
        isCurrent: isCurrentMonth,
        incidentCount
      });
    }
    
    return result;
  };
  
  const allMonths = getAllMonths();
  
  
  useEffect(() => {
    
    const currentMonthIndex = allMonths.findIndex(month => month.isCurrent);
    if (currentMonthIndex !== -1) {
      
      const idealStart = Math.max(0, currentMonthIndex - Math.floor(MONTHS_PER_VIEW / 2));
      setRangeStartIndex(Math.min(idealStart, allMonths.length - MONTHS_PER_VIEW));
    }
    setIsInitialLoading(false);
  }, []);

  
  useEffect(() => {
    if (!statusPageId) return;
    
    const endIndex = Math.min(rangeStartIndex + MONTHS_PER_VIEW, allMonths.length);
    const currentViewMonths = allMonths.slice(rangeStartIndex, endIndex);
    
    
    currentViewMonths.forEach(async (monthData) => {
      try {
        const monthIndex = ['January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'].indexOf(monthData.month);
        
        const response = await fetch(
          `/api/public/status-pages/${statusPageId}/incidents?` +
          `startDate=${new Date(monthData.year, monthIndex, 1).toISOString()}&` +
          `endDate=${new Date(monthData.year, monthIndex + 1, 0, 23, 59, 59).toISOString()}&` +
          `pageSize=100`
        );
        
        if (response.ok) {
          const data = await response.json();
          const monthKey = `${monthData.year}-${monthIndex + 1}`;
          setMonthsWithIncidents(prev => new Map(prev.set(monthKey, data.total || 0)));
        }
      } catch (error) {
        console.error(`Error fetching incidents for ${monthData.displayName}:`, error);
      }
    });
  }, [statusPageId, rangeStartIndex, allMonths]);

  
  const getCurrentViewMonths = (): MonthData[] => {
    const endIndex = Math.min(rangeStartIndex + MONTHS_PER_VIEW, allMonths.length);
    const viewMonths = allMonths.slice(rangeStartIndex, endIndex);
    return viewMonths.reverse(); 
  };
  
  
  const getRangeDisplay = (months: MonthData[]): string => {
    if (months.length === 0) return '';
    const startMonth = months[months.length - 1]; 
    const endMonth = months[0]; 
    
    return `${startMonth.shortMonth} ${startMonth.year} to ${endMonth.shortMonth} ${endMonth.year}`;
  };
  
  
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

  
  if (isInitialLoading) {
    return <IncidentsListSkeleton />;
  }

  
  const getMonthStatusInfo = (monthData: MonthData) => {
    const incidentCount = monthData.incidentCount || 0;
    
    if (incidentCount > 0) {
      return {
        icon: <XCircle className="w-5 h-5 text-destructive" />,
        text: `${incidentCount} incident${incidentCount > 1 ? 's' : ''} reported`,
        textColor: "text-destructive",
        bgColor: "bg-destructive/10 border-destructive/20"
      };
    } else if (monthData.isCurrent) {
      return {
        icon: <CheckCircle className="w-5 h-5 text-primary" />,
        text: "Current month - No incidents reported",
        textColor: "text-primary",
        bgColor: "bg-primary/10 border-primary/20"
      };
    } else {
      return {
        icon: <CheckCircle className="w-5 h-5 text-green-500" />,
        text: "No incidents reported",
        textColor: "text-muted-foreground",
        bgColor: ""
      };
    }
  };

  return (
    <>
      
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

      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {months.map((monthData, index) => {
          const statusInfo = getMonthStatusInfo(monthData);
          
          return (
            <Card 
              key={`${monthData.month}-${monthData.year}-${index}`} 
              className={`shadow-sm hover:shadow-md transition-all duration-200 ${statusInfo.bgColor} ${
                monthData.isCurrent ? 'ring-2 ring-primary/20' : ''
              } ${monthData.hasIncidents ? 'ring-2 ring-destructive/20' : 'hover:border-primary/10'}`}
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

      
      <div className="mt-8 text-center">
        <p className="text-sm text-muted-foreground">
          Showing {months.length} months (1 year back to 1 year ahead from today)
        </p>
      </div>
    </>
  );
};

export default IncidentsList;

