
"use client";

import * as React from "react";
import { format, differenceInCalendarDays, startOfDay } from "date-fns";
import { Calendar as CalendarIcon, MapPin, Check, X as XIcon, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface LocationDateSelectorProps {
  location: string;
  onLocationChange: (location: string) => void;
  selectedDate: Date;
  onDateChange: (date: Date | undefined) => void;
  maxApiForecastDays: number; // Added prop
}

const capitalizeFirstLetter = (str: string): string => {
  if (!str) return str;
  if (str.toLowerCase() === "auto:ip") {
    return str;
  }
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export function LocationDateSelector({
  location: propsLocation,
  onLocationChange,
  selectedDate,
  onDateChange,
  maxApiForecastDays, // Use prop
}: LocationDateSelectorProps) {
  const [currentLocationInput, setCurrentLocationInput] = React.useState(
    propsLocation.toLowerCase() === "auto:ip" ? "" : capitalizeFirstLetter(propsLocation)
  );
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);
  
  const [provisionalDatePart, setProvisionalDatePart] = React.useState<Date | undefined>(selectedDate);
  const [provisionalTimePart, setProvisionalTimePart] = React.useState<string>(format(selectedDate, "HH:mm"));
  const [showDateTooltip, setShowDateTooltip] = React.useState(false);

  React.useEffect(() => {
    setCurrentLocationInput(propsLocation.toLowerCase() === "auto:ip" ? "" : capitalizeFirstLetter(propsLocation));
  }, [propsLocation]);

  React.useEffect(() => {
    setProvisionalDatePart(selectedDate);
    setProvisionalTimePart(format(selectedDate, "HH:mm"));
  }, [selectedDate]);

  React.useEffect(() => {
    if (provisionalDatePart) {
      const today = startOfDay(new Date());
      const diffDays = differenceInCalendarDays(startOfDay(provisionalDatePart), today);
      setShowDateTooltip(diffDays > maxApiForecastDays || diffDays < 0);
    } else {
      setShowDateTooltip(false);
    }
  }, [provisionalDatePart, maxApiForecastDays]);

  const handleLocationCommit = () => {
    const trimmedInput = currentLocationInput.trim();
    if (trimmedInput === "") {
      if (propsLocation !== "auto:ip") {
        onLocationChange("auto:ip");
      }
    } else {
      const newLocation = capitalizeFirstLetter(trimmedInput);
      if (propsLocation !== newLocation) {
        onLocationChange(newLocation);
      }
    }
  };
  
  const handleLocationKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleLocationCommit();
      (e.target as HTMLInputElement).blur();
    }
  };

  const handleConfirmDateTime = () => {
    if (provisionalDatePart) {
      const [hours, minutes] = provisionalTimePart.split(':').map(Number);
      const newCombinedDate = new Date(
        provisionalDatePart.getFullYear(),
        provisionalDatePart.getMonth(),
        provisionalDatePart.getDate(),
        hours,
        minutes
      );
      onDateChange(newCombinedDate);
    }
    setIsCalendarOpen(false);
  };

  const handleCancelDateTime = () => {
    setProvisionalDatePart(selectedDate);
    setProvisionalTimePart(format(selectedDate, "HH:mm"));
    setIsCalendarOpen(false);
  };

  const handlePopoverOpenChange = (open: boolean) => {
    if (open) {
      setProvisionalDatePart(selectedDate);
      setProvisionalTimePart(format(selectedDate, "HH:mm"));
    }
    setIsCalendarOpen(open);
  };
  
  const CalendarWithTooltip = (
    <Calendar
      mode="single"
      selected={provisionalDatePart}
      onSelect={setProvisionalDatePart}
      initialFocus
    />
  );

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <MapPin className="text-primary" />
          Location & Date/Time
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="location" className="text-sm font-medium">
            Location
          </Label>
          <Input
            id="location"
            type="text"
            value={currentLocationInput}
            onChange={(e) => setCurrentLocationInput(e.target.value)}
            onBlur={handleLocationCommit}
            onKeyDown={handleLocationKeyDown}
            placeholder="E.g., New York, London or Current Location"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="date-time" className="text-sm font-medium">
            Date & Time
          </Label>
          <Popover open={isCalendarOpen} onOpenChange={handlePopoverOpenChange}>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                id="date-time"
                className={cn(
                  "w-full justify-start text-left font-normal mt-1",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, "PPP, p") : <span>Pick a date and time</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              {showDateTooltip ? (
                <TooltipProvider delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger asChild>{CalendarWithTooltip}</TooltipTrigger>
                    <TooltipContent side="bottom" align="start" className="max-w-xs bg-background border-border shadow-lg p-2">
                      <div className="flex items-start gap-1.5">
                        <Info size={16} className="text-amber-600 mt-0.5 shrink-0" />
                        <p className="text-xs">
                          Forecasts beyond {maxApiForecastDays + 1} days or in the past are AI-generated estimates. Check closer to the date for official forecasts.
                        </p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                CalendarWithTooltip
              )}
              <div className="p-3 border-t border-border">
                <Label htmlFor="time-select" className="text-sm font-medium">Select Time</Label>
                <Input 
                  id="time-select"
                  type="time" 
                  value={provisionalTimePart}
                  onChange={(e) => setProvisionalTimePart(e.target.value)}
                  className="mt-1 w-full"
                />
              </div>
              <div className="p-2 border-t border-border flex justify-end space-x-2">
                <Button variant="ghost" size="sm" onClick={handleCancelDateTime}>
                  <XIcon className="mr-1 h-4 w-4" /> Cancel
                </Button>
                <Button variant="default" size="sm" onClick={handleConfirmDateTime}>
                  <Check className="mr-1 h-4 w-4" /> Confirm
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </CardContent>
    </Card>
  );
}
