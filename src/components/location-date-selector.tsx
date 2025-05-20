"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, MapPin } from "lucide-react";
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

export function LocationDateSelector({
  location,
  onLocationChange,
  selectedDate,
  onDateChange,
}: LocationDateSelectorProps) {
  const [currentLocationInput, setCurrentLocationInput] = React.useState(location);

  React.useEffect(() => {
    setCurrentLocationInput(location);
  }, [location]);

  const handleLocationBlur = () => {
    if (currentLocationInput.trim() !== "" && currentLocationInput !== location) {
      onLocationChange(currentLocationInput);
    }
  };
  
  const handleLocationKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
       if (currentLocationInput.trim() !== "" && currentLocationInput !== location) {
        onLocationChange(currentLocationInput);
      }
    }
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
            placeholder="E.g., New York, London"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="date" className="text-sm font-medium">
            Date
          </Label>
          <Popover>
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
                selected={selectedDate}
                onSelect={onDateChange}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </CardContent>
    </Card>
  );
}
