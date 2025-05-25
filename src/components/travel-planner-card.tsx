
"use client";

import * as React from "react";
import Link from "next/link";
import type { TravelPlanItem, NotificationFrequency } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { Plane, Mail, Clock, Trash2, PlusCircle, ListChecks, CalendarDays, MapPin, Edit3, Repeat, Eye, Info, LogIn, AlertTriangle } from "lucide-react";
import { format, parseISO, isValid, isBefore, startOfDay } from "date-fns";
import { TravelPlanDetailsDialog } from "./travel-plan-details-dialog";
import { useAuth } from "@/hooks/use-auth";
import { useAppSettings } from "@/contexts/app-settings-context"; // Import useAppSettings
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { db } from "@/lib/firebase";
import { collection, addDoc, query, getDocs, deleteDoc, doc, onSnapshot, orderBy, Timestamp } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";

const generateTimeOptions = () => {
  const options = [];
  for (let i = 0; i < 24; i++) {
    const hourString = i.toString().padStart(2, "0");
    const value = `${hourString}:00`;
    let label;
    if (i === 0) label = "12:00 AM (Midnight)";
    else if (i === 12) label = "12:00 PM (Noon)";
    else if (i < 12) label = `${i}:00 AM`;
    else label = `${i - 12}:00 PM`;
    options.push({ value, label });
  }
  return options;
};
const timeOptions = generateTimeOptions();

export function TravelPlannerCard() {
  const { settings: appSettings, isLoadingSettings: appSettingsLoading } = useAppSettings(); // Get app settings
  const [travelPlans, setTravelPlans] = React.useState<TravelPlanItem[]>([]);
  
  const [newTripName, setNewTripName] = React.useState("");
  const [newLocation, setNewLocation] = React.useState("");
  const [newEmail, setNewEmail] = React.useState("");
  const [newStartDate, setNewStartDate] = React.useState<Date | undefined>(undefined);
  const [newEndDate, setNewEndDate] = React.useState<Date | undefined>(undefined);
  // Use default from appSettings once loaded
  const [newTime, setNewTime] = React.useState<string>(appSettings.defaultNotificationTime);
  const [newNotificationFrequency, setNewNotificationFrequency] = React.useState<NotificationFrequency>(appSettings.defaultNotificationFrequency);
  const [newTripContext, setNewTripContext] = React.useState<string>("");

  const [isStartDatePickerOpen, setIsStartDatePickerOpen] = React.useState(false);
  const [isEndDatePickerOpen, setIsEndDatePickerOpen] = React.useState(false);

  const [selectedPlanForDetails, setSelectedPlanForDetails] = React.useState<TravelPlanItem | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = React.useState(false);

  const [isLoadingPlans, setIsLoadingPlans] = React.useState(true);
  const [isAddingPlan, setIsAddingPlan] = React.useState(false);

  const { toast } = useToast();
  const { isAuthenticated, user, isLoading: authIsLoading } = useAuth();

  React.useEffect(() => {
    if (!appSettingsLoading) {
      setNewTime(appSettings.defaultNotificationTime);
      setNewNotificationFrequency(appSettings.defaultNotificationFrequency);
    }
  }, [appSettingsLoading, appSettings.defaultNotificationTime, appSettings.defaultNotificationFrequency]);

  React.useEffect(() => {
    if (authIsLoading) return; 

    if (isAuthenticated && user) {
      setIsLoadingPlans(true);
      const plansCollectionRef = collection(db, "users", user.uid, "travelPlans");
      const q = query(plansCollectionRef, orderBy("startDate", "desc"));

      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const plans: TravelPlanItem[] = [];
        querySnapshot.forEach((doc) => {
          plans.push({ id: doc.id, ...doc.data() } as TravelPlanItem);
        });
        setTravelPlans(plans);
        setIsLoadingPlans(false);
      }, (error) => {
        console.error("Error fetching travel plans:", error);
        toast({ title: "Error", description: "Could not load travel plans.", variant: "destructive" });
        setIsLoadingPlans(false);
      });
      return () => unsubscribe(); 
    } else {
      setTravelPlans([]);
      setIsLoadingPlans(false);
    }
  }, [isAuthenticated, user, authIsLoading, toast]);


  const handleAddTravelPlan = async () => {
    if (!isAuthenticated || !user) {
      toast({ title: "Login Required", description: "Please log in to add travel plans.", variant: "destructive" });
      return;
    }
    if (!newTripName.trim() || !newLocation.trim() || !newEmail.trim() || !newStartDate || !newEndDate) {
      toast({ title: "Missing Information", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      toast({ title: "Invalid Email", description: "Please enter a valid email address.", variant: "destructive" });
      return;
    }
    if (isBefore(newEndDate, newStartDate)) {
      toast({ title: "Invalid Date Range", description: "End date cannot be before the start date.", variant: "destructive" });
      return;
    }

    setIsAddingPlan(true);
    const selectedTimeOption = timeOptions.find(option => option.value === newTime);
    const newPlanData = {
      tripName: newTripName.trim(),
      location: newLocation.trim(),
      email: newEmail.trim(),
      startDate: newStartDate.toISOString(), 
      endDate: newEndDate.toISOString(),   
      notificationTime: newTime,
      notificationTimeLabel: selectedTimeOption?.label || newTime,
      notificationFrequency: newNotificationFrequency,
      tripContext: newTripContext.trim() || "",
      userId: user.uid, 
      createdAt: new Date().toISOString(), 
    };

    try {
      const plansCollectionRef = collection(db, "users", user.uid, "travelPlans");
      await addDoc(plansCollectionRef, newPlanData);

      setNewTripName("");
      setNewLocation("");
      setNewEmail("");
      setNewStartDate(undefined);
      setNewEndDate(undefined);
      setNewTime(appSettings.defaultNotificationTime); // Reset to default from settings
      setNewNotificationFrequency(appSettings.defaultNotificationFrequency); // Reset to default
      setNewTripContext("");
      toast({
        title: "Travel Plan Added",
        description: `Notifications for ${newPlanData.tripName} will be configured.`,
      });
    } catch (error) {
      console.error("Error adding travel plan to Firestore:", error);
      toast({ title: "Error", description: "Could not add travel plan. Please try again.", variant: "destructive" });
    } finally {
      setIsAddingPlan(false);
    }
  };

  const handleDeleteTravelPlan = async (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!isAuthenticated || !user) {
      toast({ title: "Login Required", description: "Please log in to delete travel plans.", variant: "destructive" });
      return;
    }

    try {
      const planDocRef = doc(db, "users", user.uid, "travelPlans", id);
      await deleteDoc(planDocRef);
      toast({ title: "Travel Plan Removed", description: "The travel plan has been deleted." });
    } catch (error) {
      console.error("Error deleting travel plan from Firestore:", error);
      toast({ title: "Error", description: "Could not delete travel plan.", variant: "destructive" });
    }
  };

  const handleViewDetails = (plan: TravelPlanItem) => {
    setSelectedPlanForDetails(plan);
    setIsDetailsDialogOpen(true);
  };

  if (authIsLoading || appSettingsLoading) {
    return (
      <Card className="shadow-lg">
        <CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader>
        <CardContent><Skeleton className="h-64 w-full" /></CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Plane className="text-primary" /> My Travel Plans
          </CardTitle>
          <CardDescription>
            Plan your trips and receive weather updates and suggestions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isAuthenticated ? (
            <Alert variant="default" className="mb-6">
              <AlertTriangle className="h-5 w-5" />
              <AlertTitle className="font-semibold">Log In to Manage Travel Plans</AlertTitle>
              <AlertDescription>
                Please log in to save and manage your travel plans in the cloud.
                Your plans will be accessible across devices and notifications (simulated) can be enabled.
                If you add plans now, they will be stored locally and may be lost.
                <br />
                <Link href="/login" passHref>
                  <span className="font-medium text-primary hover:underline cursor-pointer">
                    Log in or Sign up
                  </span>
                </Link>
              </AlertDescription>
            </Alert>
          ) : (
          <div className="space-y-4 p-4 border rounded-md bg-card">
            <h3 className="text-lg font-semibold flex items-center gap-2"><PlusCircle size={20} /> Add New Travel Plan</h3>

            <div>
              <Label htmlFor="trip-name">Trip Name</Label>
              <Input id="trip-name" value={newTripName} onChange={(e) => setNewTripName(e.target.value)} placeholder="E.g., Summer Vacation" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="travel-location">Location</Label>
              <Input id="travel-location" value={newLocation} onChange={(e) => setNewLocation(e.target.value)} placeholder="E.g., Paris, Tokyo" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="travel-email">Email Address (for notifications)</Label>
              <Input id="travel-email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="your.email@example.com" className="mt-1" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start-date">Start Date</Label>
                <Popover open={isStartDatePickerOpen} onOpenChange={setIsStartDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal mt-1">
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {newStartDate ? format(newStartDate, "PPP") : "Select start date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={newStartDate} onSelect={(date) => { setNewStartDate(date); setIsStartDatePickerOpen(false); if (date && newEndDate && isBefore(newEndDate, date)) setNewEndDate(undefined); }} disabled={(date) => isBefore(date, startOfDay(new Date()))} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label htmlFor="end-date">End Date</Label>
                 <Popover open={isEndDatePickerOpen} onOpenChange={setIsEndDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal mt-1">
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {newEndDate ? format(newEndDate, "PPP") : "Select end date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={newEndDate} onSelect={(date) => { setNewEndDate(date); setIsEndDatePickerOpen(false); }} disabled={(date) => (newStartDate && isBefore(date, newStartDate)) || isBefore(date, startOfDay(new Date()))} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="travel-time">Notification Time</Label>
                <Select value={newTime} onValueChange={setNewTime}>
                  <SelectTrigger id="travel-time" className="w-full mt-1"><SelectValue placeholder="Select time" /></SelectTrigger>
                  <SelectContent>{timeOptions.map((option) => (<SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="notification-frequency">Notification Frequency</Label>
                <Select value={newNotificationFrequency} onValueChange={(value) => setNewNotificationFrequency(value as NotificationFrequency)}>
                  <SelectTrigger id="notification-frequency" className="w-full mt-1"><SelectValue placeholder="Select frequency" /></SelectTrigger>
                  <SelectContent><SelectItem value="daily">Daily</SelectItem><SelectItem value="weekly">Weekly</SelectItem></SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="trip-context">Trip-Specific Context (Optional)</Label>
              <Textarea id="trip-context" value={newTripContext} onChange={(e) => setNewTripContext(e.target.value)} placeholder="E.g., Business meetings, prefer indoor activities." className="mt-1 min-h-[80px]" />
            </div>

            <Button onClick={handleAddTravelPlan} className="w-full" disabled={isAddingPlan || !isAuthenticated}>
              {isAddingPlan ? "Adding..." : <><PlusCircle className="mr-2" /> Add Travel Plan</>}
            </Button>
          </div>
          )}

          <div className="space-y-3">
             <h3 className="text-lg font-semibold flex items-center gap-2 pt-4 border-t"><ListChecks size={20} /> Your Travel Plans</h3>
            {isLoadingPlans && isAuthenticated && (
                <div className="space-y-3">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                </div>
            )}
            {!isLoadingPlans && isAuthenticated && travelPlans.length === 0 && (
              <p className="text-sm text-muted-foreground">No travel plans added yet.</p>
            )}
            {!isAuthenticated && !authIsLoading && (
                 <p className="text-sm text-muted-foreground">Log in to see your saved travel plans.</p>
            )}
            {!isLoadingPlans && isAuthenticated && (
              <ul className="space-y-3">
                {travelPlans.map((plan) => {
                  let startDate, endDate;
                  try {
                    startDate = parseISO(plan.startDate);
                    endDate = parseISO(plan.endDate);
                  } catch (e) {
                    console.error("Invalid date format in plan:", plan, e);
                    // Skip rendering this plan or render an error state for it
                    return <li key={plan.id} className="p-4 border rounded-md bg-destructive/10 text-destructive">Invalid date format for plan: {plan.tripName}</li>;
                  }
                  return (
                  <li
                    key={plan.id}
                    className="p-4 border rounded-md bg-card shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleViewDetails(plan)}
                    role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && handleViewDetails(plan)}
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
                      <div className="text-sm flex-grow space-y-0.5">
                        <p className="font-semibold text-base flex items-center gap-1.5"><Edit3 size={16} /> {plan.tripName}</p>
                        <p className="text-muted-foreground flex items-center gap-1.5"><MapPin size={12} /> {plan.location}</p>
                        <p className="text-muted-foreground text-xs flex items-center gap-1.5"><Mail size={12} /> {plan.email}</p>
                        <p className="text-muted-foreground text-xs flex items-center gap-1.5">
                          <CalendarDays size={12} />
                          {isValid(startDate) ? format(startDate, "MMM d, yyyy") : "Invalid date"} - {isValid(endDate) ? format(endDate, "MMM d, yyyy") : "Invalid date"}
                        </p>
                        <p className="text-muted-foreground text-xs flex items-center gap-1.5"><Clock size={12} /> At {plan.notificationTimeLabel || plan.notificationTime}</p>
                        <p className="text-muted-foreground text-xs flex items-center gap-1.5 capitalize"><Repeat size={12} /> {plan.notificationFrequency}</p>
                        {plan.tripContext && (<p className="text-muted-foreground text-xs flex items-start gap-1.5 pt-1"><Info size={12} className="mt-0.5 shrink-0" /> <span className="italic truncate">Context: {plan.tripContext.length > 50 ? `${plan.tripContext.substring(0, 50)}...` : plan.tripContext}</span></p>)}
                      </div>
                      <div className="flex items-center self-end sm:self-center space-x-2">
                        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleViewDetails(plan);}} aria-label="View summary" className="px-2 py-1 h-auto text-xs"><Eye className="mr-1.5 h-3 w-3" /> View</Button>
                        <Button variant="ghost" size="icon" onClick={(e) => handleDeleteTravelPlan(plan.id, e)} aria-label="Delete travel plan" className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  </li>
                )})}
              </ul>
            )}
          </div>
        </CardContent>
         <CardFooter>
          <p className="text-xs text-muted-foreground">
            Daily/Weekly email notifications with suggestions are simulated. Full functionality would require a backend service.
          </p>
        </CardFooter>
      </Card>

      {selectedPlanForDetails && (
        <TravelPlanDetailsDialog
          isOpen={isDetailsDialogOpen}
          onOpenChange={setIsDetailsDialogOpen}
          plan={selectedPlanForDetails}
        />
      )}
    </>
  );
}
