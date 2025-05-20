
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
import { Plane, CalendarDays, MapPin, ExternalLink } from "lucide-react";
import { format, parseISO } from "date-fns";
import type { TravelPlanItem } from "@/types";
import Link from "next/link";

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
  if (!plan) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Plane className="text-primary" /> {plan.tripName} - Summary
          </DialogTitle>
            <div className="pt-2 space-y-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <MapPin size={14}/> {plan.location}
              </div>
              <div className="flex items-center gap-2">
                <CalendarDays size={14}/> 
                {format(parseISO(plan.startDate), "MMM d, yyyy")} - {format(parseISO(plan.endDate), "MMM d, yyyy")}
              </div>
               <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-mail"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                {plan.email}
              </div>
              <div className="flex items-center gap-2 capitalize">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-repeat"><path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/></svg>
                {plan.notificationFrequency} at {plan.notificationTimeLabel || plan.notificationTime}
              </div>
            </div>
        </DialogHeader>
        
        <DialogDescription className="pt-4">
          This is a summary of your travel plan. For a detailed daily itinerary with weather forecasts and suggestions, please view the full plan.
        </DialogDescription>

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Link href={`/trip/${plan.id}`} passHref>
            <Button>
              <ExternalLink className="mr-2 h-4 w-4" /> View Full Plan
            </Button>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
