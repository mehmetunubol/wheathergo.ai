
"use client";

import * as React from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from "firebase/firestore";
import type { User } from "@/types";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2, ShieldCheck, ShieldOff, UserCheck, UserX, ShieldAlert } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { format, parseISO } from 'date-fns';

export default function AdminUsersPage() {
  const { user: adminUser, isAdmin: isAdminAuth } = useAuth();
  const [users, setUsers] = React.useState<User[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const { toast } = useToast();

  const fetchUsers = React.useCallback(async () => {
    if (!isAdminAuth) {
      setError("You do not have permission to view this page.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const usersCollectionRef = collection(db, "users");
      const q = query(usersCollectionRef, orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const fetchedUsers: User[] = [];
      querySnapshot.forEach((doc) => {
        // Ensure uid is part of the object, matching the User type
        fetchedUsers.push({ uid: doc.id, ...doc.data() } as User);
      });
      setUsers(fetchedUsers);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError("Failed to fetch users. Please try again.");
      toast({
        title: "Error Fetching Users",
        description: (err as Error).message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [isAdminAuth, toast]);

  React.useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleToggleAdmin = async (userId: string, currentIsAdmin: boolean) => {
    if (userId === adminUser?.uid) {
      toast({ title: "Action Denied", description: "You cannot change your own admin status.", variant: "destructive" });
      return;
    }
    try {
      const userDocRef = doc(db, "users", userId);
      await updateDoc(userDocRef, { isAdmin: !currentIsAdmin });
      setUsers((prevUsers) =>
        prevUsers.map((u) =>
          u.uid === userId ? { ...u, isAdmin: !currentIsAdmin } : u
        )
      );
      toast({ title: "Admin Status Updated", description: `User ${userId} admin status set to ${!currentIsAdmin}.` });
    } catch (err) {
      console.error("Error updating admin status:", err);
      toast({ title: "Update Failed", description: "Could not update admin status.", variant: "destructive" });
    }
  };

  const handleToggleActive = async (userId: string, currentIsActive: boolean) => {
     if (userId === adminUser?.uid) {
      toast({ title: "Action Denied", description: "You cannot change your own active status.", variant: "destructive" });
      return;
    }
    try {
      const userDocRef = doc(db, "users", userId);
      await updateDoc(userDocRef, { isActive: !currentIsActive });
      setUsers((prevUsers) =>
        prevUsers.map((u) =>
          u.uid === userId ? { ...u, isActive: !currentIsActive } : u
        )
      );
      toast({ title: "User Status Updated", description: `User ${userId} active status set to ${!currentIsActive}.` });
    } catch (err) {
      console.error("Error updating active status:", err);
      toast({ title: "Update Failed", description: "Could not update active status.", variant: "destructive" });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (userId === adminUser?.uid) {
      toast({ title: "Action Denied", description: "You cannot delete your own account from here.", variant: "destructive" });
      return;
    }
    try {
      const userDocRef = doc(db, "users", userId);
      await deleteDoc(userDocRef);
      setUsers((prevUsers) => prevUsers.filter((u) => u.uid !== userId));
      toast({ title: "User Deleted", description: `User ${userId} Firestore record has been deleted.` });
    } catch (err) {
      console.error("Error deleting user:", err);
      toast({ title: "Delete Failed", description: "Could not delete user Firestore record.", variant: "destructive" });
    }
  };
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return format(parseISO(dateString), 'PPpp');
    } catch {
      return dateString; // Fallback if parsing fails
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">User Management</h1>
        <div className="border rounded-lg p-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4 py-2">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-10" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">User Management</h1>
        <div className="text-red-600 bg-red-100 border border-red-300 p-4 rounded-md flex items-center gap-2">
          <ShieldAlert className="h-5 w-5"/> {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">User Management</h1>
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[150px]">User ID</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Display Name</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead className="text-center">Is Admin</TableHead>
              <TableHead className="text-center">Is Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No users found.
                </TableCell>
              </TableRow>
            )}
            {users.map((user) => (
              <TableRow key={user.uid}>
                <TableCell className="font-medium text-xs truncate" title={user.uid}>{user.uid}</TableCell>
                <TableCell>{user.email || "N/A"}</TableCell>
                <TableCell>{user.displayName || "N/A"}</TableCell>
                <TableCell>{formatDate(user.createdAt)}</TableCell>
                <TableCell className="text-center">
                  <Switch
                    checked={user.isAdmin}
                    onCheckedChange={() => handleToggleAdmin(user.uid, !!user.isAdmin)}
                    disabled={user.uid === adminUser?.uid}
                    aria-label={user.isAdmin ? "Demote from admin" : "Promote to admin"}
                  />
                  {user.isAdmin ? <ShieldCheck className="inline-block ml-1 h-4 w-4 text-green-600" /> : <ShieldOff className="inline-block ml-1 h-4 w-4 text-muted-foreground" />}
                </TableCell>
                <TableCell className="text-center">
                  <Switch
                    checked={user.isActive}
                    onCheckedChange={() => handleToggleActive(user.uid, !!user.isActive)}
                    disabled={user.uid === adminUser?.uid}
                    aria-label={user.isActive ? "Deactivate user" : "Activate user"}
                  />
                   {user.isActive ? <UserCheck className="inline-block ml-1 h-4 w-4 text-green-600" /> : <UserX className="inline-block ml-1 h-4 w-4 text-red-600" />}
                </TableCell>
                <TableCell className="text-right">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" disabled={user.uid === adminUser?.uid}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action will delete the user's Firestore record. It will NOT delete their Firebase Authentication account. The user might be able to log in again, creating a new record.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteUser(user.uid)}>
                          Delete Record
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
