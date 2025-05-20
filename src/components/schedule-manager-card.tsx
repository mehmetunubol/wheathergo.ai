"use client";

import * as React from "react";
import type { ScheduleItem } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Mail, Clock, Trash2, PlusCircle, ListChecks } from "lucide-react";

const DEFAULT_NOTIFICATION_TIME = "21:00"; // 9 PM

// Helper to generate time options for the Select component
const generateTimeOptions = () => {
  const options = [];
  for (let i = 0; i < 24; i++) {
    const hourString = i.toString().padStart(2, "0");
    const value = `${hourString}:00`;
    let label;
    if (i === 0) {
      label = "12:00 AM (Midnight)";
    } else if (i === 12) {
      label = "12:00 PM (Noon)";
    } else if (i < 12) {
      label = `${i}:00 AM`;
    } else {
      label = `${i - 12}:00 PM`;
    }
    options.push({ value, label });
  }
  return options;
};
const timeOptions = generateTimeOptions();

export function ScheduleManagerCard() {
  const [schedules, setSchedules] = React.useState<ScheduleItem[]>([]);
  const [newLocation, setNewLocation] = React.useState("");
  const [newEmail, setNewEmail] = React.useState("");
  const [newTime, setNewTime] = React.useState<string>(DEFAULT_NOTIFICATION_TIME);
  const { toast } = useToast();

  React.useEffect(() => {
    const storedSchedules = localStorage.getItem("weatherwise-schedules");
    if (storedSchedules) {
      setSchedules(JSON.parse(storedSchedules));
    }
  }, []);

  React.useEffect(() => {
    localStorage.setItem("weatherwise-schedules", JSON.stringify(schedules));
  }, [schedules]);

  const handleAddSchedule = () => {
    if (!newLocation.trim() || !newEmail.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter location and email.",
        variant: "destructive",
      });
      return;
    }
    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    const selectedTimeOption = timeOptions.find(option => option.value === newTime);

    const newSchedule: ScheduleItem = {
      id: Date.now().toString(),
      location: newLocation.trim(),
      email: newEmail.trim(),
      notificationTime: newTime,
      label: selectedTimeOption?.label || newTime,
    };
    setSchedules([...schedules, newSchedule]);
    setNewLocation("");
    setNewEmail("");
    setNewTime(DEFAULT_NOTIFICATION_TIME);
    toast({
      title: "Schedule Added",
      description: `Notifications for ${newSchedule.location} will be sent to ${newSchedule.email} at ${newSchedule.label}.`,
    });
  };

  const handleDeleteSchedule = (id: string) => {
    setSchedules(schedules.filter((schedule) => schedule.id !== id));
    toast({
      title: "Schedule Removed",
      description: "The notification schedule has been deleted.",
    });
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <Mail className="text-primary" /> Daily Email Notifications
        </CardTitle>
        <CardDescription>
          Set up daily weather and suggestion emails. (Note: Actual email sending is simulated in this prototype.)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4 p-4 border rounded-md bg-card">
          <h3 className="text-lg font-semibold flex items-center gap-2"><PlusCircle size={20} /> Add New Schedule</h3>
          <div>
            <Label htmlFor="schedule-location">Location</Label>
            <Input
              id="schedule-location"
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
              placeholder="E.g., London"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="schedule-email">Email Address</Label>
            <Input
              id="schedule-email"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="your.email@example.com"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="schedule-time">Notification Time</Label>
            <Select value={newTime} onValueChange={setNewTime}>
              <SelectTrigger id="schedule-time" className="w-full mt-1">
                <SelectValue placeholder="Select time" />
              </SelectTrigger>
              <SelectContent>
                {timeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleAddSchedule} className="w-full">
            <PlusCircle className="mr-2" /> Add Daily Notification
          </Button>
        </div>

        <div className="space-y-3">
           <h3 className="text-lg font-semibold flex items-center gap-2 pt-4 border-t"><ListChecks size={20} /> Your Schedules</h3>
          {schedules.length === 0 ? (
            <p className="text-sm text-muted-foreground">No schedules added yet.</p>
          ) : (
            <ul className="space-y-3">
              {schedules.map((schedule) => (
                <li key={schedule.id} className="flex items-center justify-between p-3 border rounded-md bg-card shadow-sm">
                  <div className="text-sm">
                    <p className="font-medium">{schedule.location}</p>
                    <p className="text-muted-foreground text-xs">{schedule.email}</p>
                    <p className="text-muted-foreground text-xs flex items-center gap-1">
                      <Clock size={12} /> {schedule.label || schedule.notificationTime}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteSchedule(schedule.id)}
                    aria-label="Delete schedule"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
       <CardFooter>
        <p className="text-xs text-muted-foreground">
          Scheduled notifications are processed conceptually. In a real app, a backend service would handle daily email dispatch.
        </p>
      </CardFooter>
    </Card>
  );
}
