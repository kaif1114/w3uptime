'use client';

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { HealthScore, PerformanceInsight } from "@/types/analytics";
import {
  Activity,
  AlertTriangle,
  Award,
  CheckCircle,
  Info
} from "lucide-react";

interface PerformanceInsightsCardProps {
  insights: PerformanceInsight[];
  healthScore: HealthScore;
}

const getSeverityIcon = (severity: string) => {
  switch (severity) {
    case 'success':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'warning':
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    case 'error':
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    default:
      return <Info className="h-4 w-4 text-blue-500" />;
  }
};

const getSeverityVariant = (severity: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (severity) {
    case 'success':
      return 'default';
    case 'warning':
      return 'secondary';
    case 'error':
      return 'destructive';
    default:
      return 'outline';
  }
};

const getHealthScoreColor = (color: string) => {
  switch (color) {
    case 'green':
      return 'text-green-600 bg-green-50 border-green-200';
    case 'yellow':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'orange':
      return 'text-orange-600 bg-orange-50 border-orange-200';
    case 'red':
      return 'text-red-600 bg-red-50 border-red-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
};

export function PerformanceInsightsCard({ insights, healthScore }: PerformanceInsightsCardProps) {
  
  const regularInsights = insights.filter(insight => insight.insight_type !== 'health_score');

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Award className="h-5 w-5 text-blue-500" />
          Performance Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        
        <div className={`rounded-lg p-4 border ${getHealthScoreColor(healthScore.color)}`}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-sm">Overall Health Grade</h3>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">{healthScore.grade}</div>
              <div className="text-sm opacity-75">({healthScore.score}/100)</div>
            </div>
          </div>
          <Progress 
            value={healthScore.score} 
            className="h-2 mb-2" 
          />
          <p className="text-xs opacity-90">{healthScore.description}</p>
        </div>

        
        <div className="space-y-3 flex gap-3">
          {regularInsights.length > 0 ? (
            regularInsights.map((insight, index) => (
              <div key={index} className="p-3">
                <div className="flex gap-3">
                  {getSeverityIcon(insight.severity)}
                  <div className="flex-1 ">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm">{insight.insight_title}</h4>
                      <Badge variant={getSeverityVariant(insight.severity)} className="text-xs">
                        {insight.severity.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mb-2">
                      {insight.insight_message}
                    </div>
                    <div className="bg-muted/50 p-2 rounded text-xs">
                      <div className="font-medium mb-1 text-muted-foreground">Recommendation:</div>
                      <div>{insight.recommendation}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No performance insights available</p>
              <p className="text-xs mt-1">Insights will appear as data is collected</p>
            </div>
          )}
        </div>

        
        {regularInsights.length > 0 && (
          <div className="pt-2 border-t">
            <div className="text-xs text-muted-foreground mb-2">Quick Stats:</div>
            <div className="flex gap-4 text-xs">
              <div className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-500" />
                <span>{insights.filter(i => i.severity === 'success').length} Good</span>
              </div>
              <div className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-yellow-500" />
                <span>{insights.filter(i => i.severity === 'warning').length} Warning</span>
              </div>
              <div className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-red-500" />
                <span>{insights.filter(i => i.severity === 'error').length} Critical</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}