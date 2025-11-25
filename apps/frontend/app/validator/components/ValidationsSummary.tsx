"use client";

import { ValidationSummary as ValidationSummaryType } from "@/types/validator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Activity, Calendar } from "lucide-react";
import { format } from "date-fns";

interface ValidationsSummaryProps {
  validationSummary: ValidationSummaryType;
}

export default function ValidationsSummary({
  validationSummary,
}: ValidationsSummaryProps) {
  const {
    totalValidations,
    successfulValidations,
    failedValidations,
    successRate,
    lastValidationDate,
  } = validationSummary;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Validation Performance
        </CardTitle>
        <CardDescription>
          Overview of your validator&apos;s validation history and performance
          metrics
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Success Rate</span>
            <Badge variant="outline" className="text-green-600">
              {successRate.toFixed(1)}%
            </Badge>
          </div>
        </div>

        
        <div className="grid gap-4 md:grid-cols-3">
          
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium">
                {totalValidations.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Total Validations</p>
            </div>
          </div>

          
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-green-600">
                {successfulValidations.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Successful</p>
            </div>
          </div>

          
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
              <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-red-600">
                {failedValidations.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Failed</p>
            </div>
          </div>
        </div>

        
        <div className="flex items-center space-x-3 pt-4 border-t">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Last Validation</p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(lastValidationDate), "PPP 'at' p")}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
