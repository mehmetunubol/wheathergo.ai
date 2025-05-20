"use client";

import { ScheduleManagerCard } from "@/components/schedule-manager-card";

export default function NotificationsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Notification Schedules</h1>
      <p className="text-muted-foreground">
        Manage your daily email notifications for weather updates and suggestions.
      </p>
      <ScheduleManagerCard />
    </div>
  );
}
