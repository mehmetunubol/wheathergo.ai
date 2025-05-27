
"use client";

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { 
  onAuthStateChanged, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut,
  OAuthProvider,
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import type { User } from '@/types';
import { sendNotification } from '@/ai/flows/send-notification-flow'; // Added import

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  isAdmin: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithApple: () => Promise<void>; 
  loginWithEmailPassword: (email: string, password: string) => Promise<void>;
  signUpWithEmailPassword: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getAuthErrorMessage = (errorCode: string): string => {
  switch (errorCode) {
    case 'auth/invalid-email':
      return 'Invalid email address format.';
    case 'auth/user-disabled':
      return 'This user account has been disabled.';
    case 'auth/user-not-found':
      return 'No user found with this email.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/email-already-in-use':
      return 'This email address is already in use by another account.';
    case 'auth/weak-password':
      return 'Password is too weak. Please choose a stronger password.';
    case 'auth/operation-not-allowed':
      return 'Email/password accounts are not enabled.';
    default:
      return 'An unexpected authentication error occurred. Please try again.';
  }
};

// Helper function to get admin emails
async function getAdminEmails(): Promise<string[]> {
  try {
    const adminsQuery = query(collection(db, "users"), where("isAdmin", "==", true));
    const querySnapshot = await getDocs(adminsQuery);
    const emails: string[] = [];
    querySnapshot.forEach((doc) => {
      const adminData = doc.data();
      if (adminData.email) {
        emails.push(adminData.email);
      }
    });
    return emails;
  } catch (error) {
    console.error("Error fetching admin emails:", error);
    return [];
  }
}

// Helper function to notify admins
async function notifyAdminsOfNewUser(newUser: User) {
  const adminEmails = await getAdminEmails();
  if (adminEmails.length === 0) {
    console.log("No admin users found to notify.");
    return;
  }

  const subject = `New User Signup: ${newUser.displayName || newUser.email}`;
  const htmlBody = `
    <h1>New User Registration</h1>
    <p>A new user has signed up for Weatherugo:</p>
    <ul>
      <li><strong>Display Name:</strong> ${newUser.displayName || 'N/A'}</li>
      <li><strong>Email:</strong> ${newUser.email || 'N/A'}</li>
      <li><strong>UID:</strong> ${newUser.uid}</li>
      <li><strong>Created At:</strong> ${newUser.createdAt ? new Date(newUser.createdAt).toLocaleString() : 'N/A'}</li>
    </ul>
  `;

  for (const adminEmail of adminEmails) {
    try {
      console.log(`Attempting to send new user notification to admin: ${adminEmail}`);
      const result = await sendNotification({
        recipientEmail: adminEmail,
        subject: subject,
        htmlBody: htmlBody,
      });
      if (result.success) {
        console.log(`New user notification sent successfully to ${adminEmail}.`);
      } else {
        console.warn(`Failed to send new user notification to ${adminEmail}: ${result.message}`);
      }
    } catch (error) {
      console.error(`Error sending new user notification to ${adminEmail}:`, error);
    }
  }
}


export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        const userRef = doc(db, "users", firebaseUser.uid);
        const userSnap = await getDoc(userRef);
        let userData: User;
        let userIsAdmin = false;
        let isNewUser = false; // Flag to check if this is a new user creation flow within onAuthStateChanged

        if (!userSnap.exists()) {
          // This block might be hit if user signs up and then onAuthStateChanged fires
          // before the specific signup/login functions complete their Firestore write.
          // We'll primarily rely on signup/login functions to create the doc and notify.
          // However, as a fallback or for other auth providers, we can create it here.
          const newUserDocData: User = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            createdAt: new Date().toISOString(),
            photoURL: firebaseUser.photoURL,
            isAdmin: false,
            isActive: true,
          };
          await setDoc(userRef, newUserDocData);
          userData = newUserDocData;
          userIsAdmin = false;
          isNewUser = true; // Mark as new user
          console.log("User document created in onAuthStateChanged for UID:", firebaseUser.uid);
          // Potentially notify admins here too if this path is reliably distinct from explicit sign-up flows
          // For now, notification is tied to explicit sign-up functions to avoid double notifications.
        } else {
          const firestoreData = userSnap.data();
          userData = {
            uid: firebaseUser.uid,
            displayName: firestoreData.displayName || firebaseUser.displayName,
            email: firestoreData.email || firebaseUser.email,
            photoURL: firestoreData.photoURL || firebaseUser.photoURL,
            isAdmin: firestoreData.isAdmin || false,
            isActive: firestoreData.isActive === undefined ? true : firestoreData.isActive,
            createdAt: firestoreData.createdAt || new Date().toISOString(),
          };
          userIsAdmin = firestoreData.isAdmin || false;
        }
        
        if (userData.isActive) {
            setUser(userData);
            setIsAdmin(userIsAdmin);
        } else {
            setUser(null);
            setIsAdmin(false);
            console.log(`User ${userData.email} is inactive. Forcing logout.`);
            await signOut(auth); 
        }

      } else {
        setUser(null);
        setIsAdmin(false);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    setIsLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;
      const userRef = doc(db, "users", firebaseUser.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        const newUserDocData: User = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          createdAt: new Date().toISOString(),
          photoURL: firebaseUser.photoURL,
          isAdmin: false,
          isActive: true,
        };
        await setDoc(userRef, newUserDocData);
        console.log("New user signed up with Google, notifying admins for UID:", newUserDocData.uid);
        await notifyAdminsOfNewUser(newUserDocData); // Notify admins for new Google user
      }
      // If userSnap exists, onAuthStateChanged will handle setting user state.
    } catch (error: any) {
      console.error("Google login error:", error);
      setIsLoading(false);
      throw new Error(getAuthErrorMessage(error.code));
    }
    // setIsLoading(false) will be handled by onAuthStateChanged
  };
  
  const loginWithApple = async () => {
    setIsLoading(true);
    const provider = new OAuthProvider('apple.com');
    // Optionally, add scopes or parameters based on your Apple Sign-In configuration
    // provider.addScope('email');
    // provider.addScope('name');
    try {
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;
      const userRef = doc(db, "users", firebaseUser.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        const newUserDocData: User = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          createdAt: new Date().toISOString(),
          photoURL: firebaseUser.photoURL,
          isAdmin: false,
          isActive: true,
        };
        await setDoc(userRef, newUserDocData);
        await notifyAdminsOfNewUser(newUserDocData); // Notify admins for new Apple user
      }
    } catch (error: any) {
      console.error("Apple login error:", error);
      setIsLoading(false);
      throw new Error(getAuthErrorMessage(error.code));
    }
  };

  const loginWithEmailPassword = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle setting user state.
    } catch (error: any) {
      console.error("Email login error:", error);
      setIsLoading(false);
      throw new Error(getAuthErrorMessage(error.code));
    }
    // setIsLoading(false) will be handled by onAuthStateChanged
  };

  const signUpWithEmailPassword = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const displayName = email.split('@')[0]; // Default display name
      await updateProfile(userCredential.user, { displayName });
      
      const newUserDocData: User = {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        displayName: displayName,
        createdAt: new Date().toISOString(),
        photoURL: null, 
        isAdmin: false,
        isActive: true,
      };
      const userRef = doc(db, "users", userCredential.user.uid);
      await setDoc(userRef, newUserDocData);
      console.log("New user signed up with email, notifying admins for UID:", newUserDocData.uid);
      await notifyAdminsOfNewUser(newUserDocData); // Notify admins for new email/password user
      // onAuthStateChanged will handle setting user state.
    } catch (error: any) {
      console.error("Email sign-up error:", error);
      setIsLoading(false);
      throw new Error(getAuthErrorMessage(error.code));
    }
     // setIsLoading(false) will be handled by onAuthStateChanged
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await signOut(auth);
      // onAuthStateChanged will set user to null.
      // Redirect logic:
      if (pathname.startsWith('/admin') || (isAdmin && pathname !== '/login')) {
         router.push('/login'); 
      } else if (pathname !== '/login' && pathname !== '/') { // Avoid redirecting if already on login or home
        router.push('/');
      }
    } catch (error: any) {
      console.error("Logout error:", error);
      // We don't want to set isLoading false here if onAuthStateChanged hasn't fired yet.
      // But if signOut itself fails, we might need to handle it.
      // For now, onAuthStateChanged should manage isLoading.
      throw new Error(getAuthErrorMessage(error.code));
    } finally {
        // setIsLoading(false); // Let onAuthStateChanged handle this to avoid race conditions
    }
  };
  
  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      user, 
      isAdmin,
      loginWithGoogle, 
      loginWithApple, 
      loginWithEmailPassword,
      signUpWithEmailPassword,
      logout, 
      isLoading 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
