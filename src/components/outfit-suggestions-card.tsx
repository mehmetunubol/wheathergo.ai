
"use client";

import type { ClothingSuggestionsOutput } from "@/ai/flows/clothing-suggestions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Shirt, Sparkles, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/hooks/use-translation";

interface OutfitSuggestionsCardProps {
  suggestions: ClothingSuggestionsOutput | null;
  isLoading: boolean;
  limitReached?: boolean;
}

export function OutfitSuggestionsCard({ suggestions, isLoading, limitReached }: OutfitSuggestionsCardProps) {
  const { t } = useTranslation();

  if (limitReached) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shirt className="text-primary" /> {t('outfitIdeas')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 border rounded-md bg-amber-50 border-amber-200 text-amber-700 flex items-center gap-2">
            <AlertTriangle size={20} />
            <p>{t('dailyOutfitSuggestionsLimitReached')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shirt className="text-primary" /> {t('outfitIdeas')} <Sparkles className="text-accent h-4 w-4" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-1/3" /> 
          <Skeleton className="h-4 w-3/4" /> 
          <Skeleton className="h-4 w-1/2" /> 
          <Skeleton className="h-4 w-2/3" /> 
          <Skeleton className="h-4 w-1/3 mt-2" /> 
          <Skeleton className="h-10 w-full" /> 
        </CardContent>
      </Card>
    );
  }

  if (!suggestions) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shirt className="text-primary" /> {t('outfitIdeas')} <Sparkles className="text-accent h-4 w-4" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{t('outfitSuggestionsUnavailable')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Shirt className="text-primary" /> {t('outfitIdeas')} <Sparkles className="text-accent h-4 w-4" />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-semibold mb-2">{t('suggestedItems')}</h4>
          {suggestions.suggestions.length > 0 ? (
            <ul className="list-disc list-inside space-y-1 text-sm">
              {suggestions.suggestions.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{t('noOutfitItemsSuggested')}</p>
          )}
        </div>
        {suggestions.reasoning && (
          <div>
            <h4 className="font-semibold mb-2">{t('reasoning')}</h4>
            <p className="text-sm text-muted-foreground italic">{suggestions.reasoning}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
