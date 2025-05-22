
"use client";

import * as React from "react";
import { format, parse } from "date-fns";
import { Calendar as CalendarIcon, MapPin, Check, X as XIcon, Clock } from "lucide-react";
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
import { cn } from "@/lib/utils";

interface LocationDateSelectorProps {
  location: string;
  onLocationChange: (location: string) => void;
  selectedDate: Date;
  onDateChange: (date: Date | undefined) => void;
}

const capitalizeFirstLetter = (str: string): string => {
  if (!str) return str;
  if (str.toLowerCase() === "auto:ip") {
    return str;
  }
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export function LocationDateSelector({
  location,
  onLocationChange,
  selectedDate,
  onDateChange,
}: LocationDateSelectorProps) {
  const [currentLocationInput, setCurrentLocationInput] = React.useState(capitalizeFirstLetter(location));
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);
  
  // Provisional states for within the popover
  const [provisionalDatePart, setProvisionalDatePart] = React.useState<Date | undefined>(selectedDate);
  const [provisionalTimePart, setProvisionalTimePart] = React.useState<string>(format(selectedDate, "HH:mm"));

  React.useEffect(() => {
    setCurrentLocationInput(capitalizeFirstLetter(location));
  }, [location]);

  // Update provisional states if selectedDate prop changes from outside
  React.useEffect(() => {
    setProvisionalDatePart(selectedDate);
    setProvisionalTimePart(format(selectedDate, "HH:mm"));
  }, [selectedDate]);

  const handleLocationBlur = () => {
    if (currentLocationInput.trim() !== "" && currentLocationInput !== location) {
      onLocationChange(currentLocationInput);
    } else if (currentLocationInput.trim() === "" && location !== "") {
      onLocationChange("");
    } else {
       setCurrentLocationInput(capitalizeFirstLetter(location));
    }
  };
  
  const handleLocationKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
       if (currentLocationInput.trim() !== "" && currentLocationInput !== location) {
        onLocationChange(currentLocationInput);
      }
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
    // Reset provisional states to the last confirmed selectedDate
    setProvisionalDatePart(selectedDate);
    setProvisionalTimePart(format(selectedDate, "HH:mm"));
    setIsCalendarOpen(false);
  };

  const handlePopoverOpenChange = (open: boolean) => {
    if (open) {
      // When opening, ensure provisional states are synced with current selectedDate
      setProvisionalDatePart(selectedDate);
      setProvisionalTimePart(format(selectedDate, "HH:mm"));
    }
    setIsCalendarOpen(open);
  };

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
            onBlur={handleLocationBlur}
            onKeyDown={handleLocationKeyDown}
            placeholder="E.g., New York or auto:ip"
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
              <Calendar
                mode="single"
                selected={provisionalDatePart}
                onSelect={setProvisionalDatePart}
                initialFocus
              />
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
