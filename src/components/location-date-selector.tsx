
"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, MapPin, Check, X as XIcon } from "lucide-react";
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
  // Check if the string is "auto:ip" (case-insensitive) to avoid capitalizing it
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
  const [provisionalDate, setProvisionalDate] = React.useState<Date | undefined>(selectedDate);

  React.useEffect(() => {
    setCurrentLocationInput(capitalizeFirstLetter(location));
  }, [location]);

  // Update provisionalDate if selectedDate prop changes from outside
  React.useEffect(() => {
    setProvisionalDate(selectedDate);
  }, [selectedDate]);

  const handleLocationBlur = () => {
    if (currentLocationInput.trim() !== "" && currentLocationInput !== location) {
      onLocationChange(currentLocationInput);
    } else if (currentLocationInput.trim() === "" && location !== "") {
      // If input is cleared, reflect that change upwards if parent had a value
      onLocationChange("");
    } else {
      // If input matches prop (possibly after capitalization), ensure display is capitalized
       setCurrentLocationInput(capitalizeFirstLetter(location));
    }
  };
  
  const handleLocationKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
       if (currentLocationInput.trim() !== "" && currentLocationInput !== location) {
        onLocationChange(currentLocationInput);
      }
       // Blur to trigger capitalization if needed
       (e.target as HTMLInputElement).blur();
    }
  };

  const handleConfirmDate = () => {
    onDateChange(provisionalDate);
    setIsCalendarOpen(false);
  };

  const handleCancelDate = () => {
    setProvisionalDate(selectedDate); // Reset to the last confirmed date
    setIsCalendarOpen(false);
  };

  const handlePopoverOpenChange = (open: boolean) => {
    if (open) {
      // When opening, ensure provisional date is the current selected date
      setProvisionalDate(selectedDate);
    }
    setIsCalendarOpen(open);
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <MapPin className="text-primary" />
          Location & Date
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
          <Label htmlFor="date" className="text-sm font-medium">
            Date
          </Label>
          <Popover open={isCalendarOpen} onOpenChange={handlePopoverOpenChange}>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-full justify-start text-left font-normal mt-1",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={provisionalDate}
                onSelect={setProvisionalDate}
                initialFocus
              />
              <div className="p-2 border-t border-border flex justify-end space-x-2">
                <Button variant="ghost" size="sm" onClick={handleCancelDate}>
                  <XIcon className="mr-1 h-4 w-4" /> Cancel
                </Button>
                <Button variant="default" size="sm" onClick={handleConfirmDate}>
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
