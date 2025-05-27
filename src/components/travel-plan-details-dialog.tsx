
"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plane, CalendarDays, MapPin, ExternalLink, Mail, Clock, Repeat, Info } from "lucide-react";
import { format, parseISO } from "date-fns";
import type { TravelPlanItem } from "@/types";
import Link from "next/link";
import { useTranslation } from "@/hooks/use-translation";
import { useLanguage } from "@/contexts/language-context";

interface TravelPlanDetailsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  plan: TravelPlanItem | null;
}

export function TravelPlanDetailsDialog({
  isOpen,
  onOpenChange,
  plan,
}: TravelPlanDetailsDialogProps) {
  const { t } = useTranslation();
  const { dateLocale, language } = useLanguage();

  if (!plan) return null;

  const getFrequencyText = (frequency: string) => {
    if (frequency === 'daily') return t('daily');
    if (frequency === 'weekly') return t('weekly');
    return frequency;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-xl flex items-center gap-2">
            <Plane className="text-primary" /> {t('tripSummaryTitle', { tripName: plan.tripName })}
          </DialogTitle>
            <div className="pt-2 space-y-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-2"><MapPin size={14}/> {plan.location}</div>
              <div className="flex items-center gap-2">
                <CalendarDays size={14}/>
                {format(parseISO(plan.startDate), "MMM d, yyyy", { locale: dateLocale })} - {format(parseISO(plan.endDate), "MMM d, yyyy", { locale: dateLocale })}
              </div>
               <div className="flex items-center gap-2">
                <Mail size={14} /> {plan.email}
              </div>
              <div className="flex items-center gap-2">
                <Repeat size={14} />
                {t('notificationInfo', { frequency: getFrequencyText(plan.notificationFrequency), time: plan.notificationTimeLabel || plan.notificationTime })}
              </div>
              {plan.tripContext && (
                <div className="flex items-start gap-2 pt-1">
                  <Info size={14} className="mt-0.5 shrink-0" />
                  <span className="italic">{t('context')}: {plan.tripContext}</span>
                </div>
              )}
            </div>
        </DialogHeader>

        <DialogDescription className="pt-4 text-foreground/90">
          {t('tripSummaryDescription')}
        </DialogDescription>

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('close')}</Button>
          <Link href={`/trip/${plan.id}`} passHref>
            <Button>
              <ExternalLink className="mr-2 h-4 w-4" /> {t('viewFullPlanButton')}
            </Button>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
