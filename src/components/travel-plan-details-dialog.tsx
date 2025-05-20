
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
import { Plane, CalendarDays, MapPin, ExternalLink, Mail, Clock, Repeat, Info } from "lucide-react"; // Added Mail, Clock, Repeat, Info
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
        <DialogHeader className="pb-4">
          <DialogTitle className="text-xl flex items-center gap-2">
            <Plane className="text-primary" /> {plan.tripName} - Summary
          </DialogTitle>
            <div className="pt-2 space-y-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-2"><MapPin size={14}/> {plan.location}</div>
              <div className="flex items-center gap-2">
                <CalendarDays size={14}/> 
                {format(parseISO(plan.startDate), "MMM d, yyyy")} - {format(parseISO(plan.endDate), "MMM d, yyyy")}
              </div>
               <div className="flex items-center gap-2">
                <Mail size={14} /> {plan.email}
              </div>
              <div className="flex items-center gap-2 capitalize">
                <Repeat size={14} /> {plan.notificationFrequency} at {plan.notificationTimeLabel || plan.notificationTime}
              </div>
              {plan.tripContext && (
                <div className="flex items-start gap-2 pt-1"> {/* items-start for better alignment with multi-line text */}
                  <Info size={14} className="mt-0.5 shrink-0" /> 
                  <span className="italic">Context: {plan.tripContext}</span>
                </div>
              )}
            </div>
        </DialogHeader>
        
        <DialogDescription className="pt-4">
          This is a summary of your travel plan. For a detailed daily itinerary with weather forecasts and AI-powered suggestions, please view the full plan.
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
