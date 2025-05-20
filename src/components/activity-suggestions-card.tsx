"use client";

import type { ActivitySuggestionsOutput } from "@/ai/flows/activity-suggestions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ListTree, Sparkles, Tent, Building } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ActivitySuggestionsCardProps {
  suggestions: ActivitySuggestionsOutput | null;
  isLoading: boolean;
}

export function ActivitySuggestionsCard({ suggestions, isLoading }: ActivitySuggestionsCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ListTree className="text-primary" /> Activity Ideas <Sparkles className="text-accent h-4 w-4" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-1/3 mt-2" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
    );
  }

  if (!suggestions) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ListTree className="text-primary" /> Activity Ideas <Sparkles className="text-accent h-4 w-4" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Enter details to get activity suggestions.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <ListTree className="text-primary" /> Activity Ideas <Sparkles className="text-accent h-4 w-4" />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {suggestions.indoorActivities.length > 0 && (
          <div>
            <h4 className="font-semibold mb-2 flex items-center gap-1"><Building size={16} className="text-secondary-foreground" /> Indoor:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {suggestions.indoorActivities.map((activity, index) => (
                <li key={`indoor-${index}`}>{activity}</li>
              ))}
            </ul>
          </div>
        )}
        {suggestions.outdoorActivities.length > 0 && (
          <div>
            <h4 className="font-semibold mb-2 flex items-center gap-1"><Tent size={16} className="text-secondary-foreground"/> Outdoor:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {suggestions.outdoorActivities.map((activity, index) => (
                <li key={`outdoor-${index}`}>{activity}</li>
              ))}
            </ul>
          </div>
        )}
        {suggestions.indoorActivities.length === 0 && suggestions.outdoorActivities.length === 0 && (
           <p className="text-sm text-muted-foreground">No activities suggested for the current conditions.</p>
        )}
      </CardContent>
    </Card>
  );
}
