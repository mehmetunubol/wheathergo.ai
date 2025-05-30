
"use client";

import * as React from "react";
import Link from "next/link";
import type { TravelPlanItem, NotificationFrequency, AppSettings } from "@/types";
// import { USAGE_LIMITS } from "@/types"; // No longer needed, use appSettings
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
import { useAppSettings } from "@/contexts/app-settings-context";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { db } from "@/lib/firebase";
import { collection, addDoc, query, getDocs, deleteDoc, doc, onSnapshot, orderBy, updateDoc, runTransaction } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/contexts/language-context";
import { useTranslation } from "@/hooks/use-translation";

const generateTimeOptions = (t: (key: any) => string) => { 
  const options = [];
  for (let i = 0; i < 24; i++) {
    const hourString = i.toString().padStart(2, "0");
    const value = `${hourString}:00`;
    let label;
    if (i === 0) label = `12:00 AM (${t('midnight') || 'Midnight'})`; 
    else if (i === 12) label = `12:00 PM (${t('noon') || 'Noon'})`; 
    else if (i < 12) label = `${i}:00 AM`;
    else label = `${i - 12}:00 PM`;
    options.push({ value, label });
  }
  return options;
};


export function TravelPlannerCard() {
  const { settings: appSettings, isLoadingSettings: appSettingsLoading } = useAppSettings();
  const { dateLocale, language } = useLanguage();
  const { t } = useTranslation();
  
  const timeOptions = React.useMemo(() => generateTimeOptions(t), [t]);

  const [travelPlans, setTravelPlans] = React.useState<TravelPlanItem[]>([]);
  
  const [newTripName, setNewTripName] = React.useState("");
  const [newLocation, setNewLocation] = React.useState("");
  const [newEmail, setNewEmail] = React.useState("");
  const [newStartDate, setNewStartDate] = React.useState<Date | undefined>(undefined);
  const [newEndDate, setNewEndDate] = React.useState<Date | undefined>(undefined);
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
    if (authIsLoading || appSettingsLoading) return; 

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
        toast({ title: t('error'), description: "Could not load travel plans.", variant: "destructive" });
        setIsLoadingPlans(false);
      });
      return () => unsubscribe(); 
    } else {
      setTravelPlans([]);
      setIsLoadingPlans(false);
    }
  }, [isAuthenticated, user, authIsLoading, toast, t, appSettingsLoading]);


  const handleAddTravelPlan = async () => {
    if (!isAuthenticated || !user) {
      toast({ title: t('loginToManageTravelPlans'), description: "Please log in to add travel plans.", variant: "destructive" });
      return;
    }
    if (!newTripName.trim() || !newLocation.trim() || !newEmail.trim() || !newStartDate || !newEndDate) {
      toast({ title: t('error'), description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      toast({ title: t('error'), description: "Please enter a valid email address.", variant: "destructive" });
      return;
    }
    if (isBefore(newEndDate, newStartDate)) {
      toast({ title: t('error'), description: "End date cannot be before the start date.", variant: "destructive" });
      return;
    }
    if (appSettingsLoading) {
      toast({ title: t('error'), description: "App settings still loading, please wait.", variant: "destructive"});
      return;
    }

    const currentPlanLimit = user.isPremium ? appSettings.premiumTierLimits.maxTravelPlans : appSettings.freeTierLimits.maxTravelPlans;
    if (travelPlans.length >= currentPlanLimit) {
        toast({
            title: t('limitReachedTitle'),
            description: t('maxTravelPlansLimitReached'),
            variant: "destructive",
        });
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
      setNewTime(appSettings.defaultNotificationTime);
      setNewNotificationFrequency(appSettings.defaultNotificationFrequency);
      setNewTripContext("");
      toast({
        title: t('travelPlans'),
        description: `${newPlanData.tripName} ${t('notificationsConfigured') || 'notifications will be configured.'}`,
      });
    } catch (error) {
      console.error("Error adding travel plan to Firestore:", error);
      toast({ title: t('error'), description: "Could not add travel plan. Please try again.", variant: "destructive" });
    } finally {
      setIsAddingPlan(false);
    }
  };

  const handleDeleteTravelPlan = async (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!isAuthenticated || !user) {
      toast({ title: t('loginToManageTravelPlans'), description: "Please log in to delete travel plans.", variant: "destructive" });
      return;
    }

    try {
      const planDocRef = doc(db, "users", user.uid, "travelPlans", id);
      await deleteDoc(planDocRef);
      toast({ title: t('travelPlans'), description: "The travel plan has been deleted." });
    } catch (error) {
      console.error("Error deleting travel plan from Firestore:", error);
      toast({ title: t('error'), description: "Could not delete travel plan.", variant: "destructive" });
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

  const canAddPlan = isAuthenticated && user && !appSettingsLoading && (travelPlans.length < (user.isPremium ? appSettings.premiumTierLimits.maxTravelPlans : appSettings.freeTierLimits.maxTravelPlans));


  return (
    <>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Plane className="text-primary" /> {t('myTravelPlans')}
          </CardTitle>
          <CardDescription>
            {t('manageTravelPlansDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isAuthenticated ? (
            <Alert variant="default" className="mb-6">
              <AlertTriangle className="h-5 w-5" />
              <AlertTitle className="font-semibold">{t('loginToManageTravelPlans')}</AlertTitle>
              <AlertDescription>
                {t('loginToManageTravelPlansDetails')}
                <br />
                <Link href="/login" passHref>
                  <span className="font-medium text-primary hover:underline cursor-pointer">
                    {t('loginOrSignUpLink')}
                  </span>
                </Link>
              </AlertDescription>
            </Alert>
          ) : (
          <div className="space-y-4 p-4 border rounded-md bg-card">
            <h3 className="text-lg font-semibold flex items-center gap-2"><PlusCircle size={20} /> {t('addNewTravelPlan')}</h3>

            <div>
              <Label htmlFor="trip-name">{t('tripNameLabel')}</Label>
              <Input id="trip-name" value={newTripName} onChange={(e) => setNewTripName(e.target.value)} placeholder={t('tripNamePlaceholder')} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="travel-location">{t('travelLocationLabel')}</Label>
              <Input id="travel-location" value={newLocation} onChange={(e) => setNewLocation(e.target.value)} placeholder={t('travelLocationPlaceholder')} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="travel-email">{t('emailForNotificationsLabel')}</Label>
              <Input id="travel-email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder={t('emailPlaceholderNotifications')} className="mt-1" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start-date">{t('startDateLabel')}</Label>
                <Popover open={isStartDatePickerOpen} onOpenChange={setIsStartDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal mt-1">
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {newStartDate ? format(newStartDate, "PPP", { locale: dateLocale }) : t('selectStartDate')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={newStartDate} onSelect={(date) => { setNewStartDate(date); setIsStartDatePickerOpen(false); if (date && newEndDate && isBefore(newEndDate, date)) setNewEndDate(undefined); }} disabled={(date) => isBefore(date, startOfDay(new Date()))} initialFocus locale={dateLocale} />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label htmlFor="end-date">{t('endDateLabel')}</Label>
                 <Popover open={isEndDatePickerOpen} onOpenChange={setIsEndDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal mt-1">
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {newEndDate ? format(newEndDate, "PPP", { locale: dateLocale }) : t('selectEndDate')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={newEndDate} onSelect={(date) => { setNewEndDate(date); setIsEndDatePickerOpen(false); }} disabled={(date) => (newStartDate && isBefore(date, newStartDate)) || isBefore(date, startOfDay(new Date()))} initialFocus locale={dateLocale} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="travel-time">{t('notificationTimeLabel')}</Label>
                <Select value={newTime} onValueChange={setNewTime}>
                  <SelectTrigger id="travel-time" className="w-full mt-1"><SelectValue placeholder={t('selectTime')} /></SelectTrigger>
                  <SelectContent>{timeOptions.map((option) => (<SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="notification-frequency">{t('notificationFrequencyLabel')}</Label>
                <Select value={newNotificationFrequency} onValueChange={(value) => setNewNotificationFrequency(value as NotificationFrequency)}>
                  <SelectTrigger id="notification-frequency" className="w-full mt-1"><SelectValue placeholder={t('selectFrequency')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">{t('daily')}</SelectItem>
                    <SelectItem value="weekly">{t('weekly')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="trip-context">{t('tripContextOptionalLabel')}</Label>
              <Textarea id="trip-context" value={newTripContext} onChange={(e) => setNewTripContext(e.target.value)} placeholder={t('tripContextPlaceholder')} className="mt-1 min-h-[80px]" />
            </div>

            <Button onClick={handleAddTravelPlan} className="w-full" disabled={isAddingPlan || !canAddPlan || appSettingsLoading}>
              {isAddingPlan ? t('addingTravelPlanButton') : <><PlusCircle className="mr-2" /> {t('addTravelPlanButton')}</>}
            </Button>
            {isAuthenticated && !appSettingsLoading && !canAddPlan && (
                 <p className="text-xs text-destructive text-center mt-1">{t('maxTravelPlansLimitReached')}</p>
            )}
          </div>
          )}

          <div className="space-y-3">
             <h3 className="text-lg font-semibold flex items-center gap-2 pt-4 border-t"><ListChecks size={20} /> {t('yourTravelPlansList')}</h3>
            {isLoadingPlans && isAuthenticated && (
                <div className="space-y-3">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                </div>
            )}
            {!isLoadingPlans && isAuthenticated && travelPlans.length === 0 && (
              <p className="text-sm text-muted-foreground">{t('noTravelPlansYet')}</p>
            )}
            {!isAuthenticated && !authIsLoading && (
                 <p className="text-sm text-muted-foreground">{t('loginToSeePlans')}</p>
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
                    return <li key={plan.id} className="p-4 border rounded-md bg-destructive/10 text-destructive">{t('error')}: Invalid date format for plan: {plan.tripName}</li>;
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
                          {isValid(startDate) ? format(startDate, "PPP", { locale: dateLocale }) : t('error')} - {isValid(endDate) ? format(endDate, "PPP", { locale: dateLocale }) : t('error')}
                        </p>
                        <p className="text-muted-foreground text-xs flex items-center gap-1.5"><Clock size={12} /> {t('atTime', {time: plan.notificationTimeLabel || plan.notificationTime})}</p> 
                        <p className="text-muted-foreground text-xs flex items-center gap-1.5 capitalize"><Repeat size={12} /> {plan.notificationFrequency === 'daily' ? t('daily') : t('weekly')}</p>
                        {plan.tripContext && (<p className="text-muted-foreground text-xs flex items-start gap-1.5 pt-1"><Info size={12} className="mt-0.5 shrink-0" /> <span className="italic truncate">{t('context')}: {plan.tripContext.length > 50 ? `${plan.tripContext.substring(0, 50)}...` : plan.tripContext}</span></p>)} 
                      </div>
                      <div className="flex items-center self-end sm:self-center space-x-2">
                        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleViewDetails(plan);}} aria-label={t('viewSummary')} className="px-2 py-1 h-auto text-xs"><Eye className="mr-1.5 h-3 w-3" /> {t('viewSummary')}</Button>
                        <Button variant="ghost" size="icon" onClick={(e) => handleDeleteTravelPlan(plan.id, e)} aria-label={t('deleteTravelPlan')} className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>
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
            {t('notificationsSimulatedFooter')}
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
