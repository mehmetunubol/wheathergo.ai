
"use client";

import { TravelPlannerCard } from "@/components/travel-planner-card"; // Updated import

export default function TravelPlannerPage() { // Renamed function
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Travel Planner</h1> {/* Updated title */}
      <p className="text-muted-foreground">
        Manage your travel plans and set up daily email notifications for weather updates and suggestions during your trips.
      </p>
      <TravelPlannerCard /> {/* Updated component */}
    </div>
  );
}
