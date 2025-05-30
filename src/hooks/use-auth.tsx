
"use client";

import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
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
import { sendNotification } from '@/ai/flows/send-notification-flow';
import { useTranslation } from '@/hooks/use-translation';
import { format } from 'date-fns';

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
  refreshUser: () => Promise<void>; // Added to refresh user data
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getAuthErrorMessage = (errorCode: string, t: (key: string) => string): string => {
  switch (errorCode) {
    case 'auth/invalid-email':
      return t('authErrorInvalidEmail');
    case 'auth/user-disabled':
      return t('authErrorUserDisabled');
    case 'auth/user-not-found':
      return t('authErrorUserNotFound');
    case 'auth/wrong-password':
      return t('authErrorWrongPassword');
    case 'auth/email-already-in-use':
      return t('authErrorEmailAlreadyInUse');
    case 'auth/weak-password':
      return t('authErrorWeakPassword');
    case 'auth/operation-not-allowed':
      return t('authErrorOperationNotAllowed');
    default:
      return t('authErrorDefault');
  }
};

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
  const { t } = useTranslation(); 

  const initializeNewUserDocument = (firebaseUser: FirebaseUser): User => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName,
      createdAt: new Date().toISOString(),
      photoURL: firebaseUser.photoURL,
      isAdmin: false,
      isActive: true,
      isPremium: false, // Default to not premium
      dailyImageGenerations: { count: 0, date: todayStr },
      dailyOutfitSuggestions: { count: 0, date: todayStr },
      dailyActivitySuggestions: { count: 0, date: todayStr },
    };
  };

  const fetchAndSetUser = useCallback(async (firebaseUser: FirebaseUser | null) => {
    if (firebaseUser) {
      const userRef = doc(db, "users", firebaseUser.uid);
      const userSnap = await getDoc(userRef);
      let userData: User;
      let userIsAdmin = false;

      if (!userSnap.exists()) {
        const newUserDocData = initializeNewUserDocument(firebaseUser);
        await setDoc(userRef, newUserDocData);
        userData = newUserDocData;
        userIsAdmin = false;
        console.log("User document created for UID:", firebaseUser.uid);
        // Notification to admins is handled in specific signup/login functions after initial doc creation
      } else {
        const firestoreData = userSnap.data() as User;
        userData = {
          uid: firebaseUser.uid,
          displayName: firestoreData.displayName || firebaseUser.displayName,
          email: firestoreData.email || firebaseUser.email,
          photoURL: firestoreData.photoURL || firebaseUser.photoURL,
          isAdmin: firestoreData.isAdmin || false,
          isActive: firestoreData.isActive === undefined ? true : firestoreData.isActive,
          createdAt: firestoreData.createdAt || new Date().toISOString(),
          isPremium: firestoreData.isPremium || false,
          dailyImageGenerations: firestoreData.dailyImageGenerations || { count: 0, date: format(new Date(), 'yyyy-MM-dd') },
          dailyOutfitSuggestions: firestoreData.dailyOutfitSuggestions || { count: 0, date: format(new Date(), 'yyyy-MM-dd') },
          dailyActivitySuggestions: firestoreData.dailyActivitySuggestions || { count: 0, date: format(new Date(), 'yyyy-MM-dd') },
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
  }, []);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      fetchAndSetUser(firebaseUser);
    });
    return () => unsubscribe();
  }, [fetchAndSetUser]);

  const refreshUser = useCallback(async () => {
    const currentFirebaseUser = auth.currentUser;
    setIsLoading(true);
    await fetchAndSetUser(currentFirebaseUser);
    // setIsLoading(false); // fetchAndSetUser will set it
  }, [fetchAndSetUser]);


  const loginWithGoogle = useCallback(async () => {
    setIsLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;
      const userRef = doc(db, "users", firebaseUser.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        const newUserDocData = initializeNewUserDocument(firebaseUser);
        await setDoc(userRef, newUserDocData); // Create doc first
        await fetchAndSetUser(firebaseUser); // Then fetch and set, which loads into context
        console.log("New user signed up with Google, notifying admins for UID:", newUserDocData.uid);
        await notifyAdminsOfNewUser(newUserDocData); 
      } else {
        await fetchAndSetUser(firebaseUser); // Fetch existing user data
      }
    } catch (error: any) {
      console.error("Google login error:", error);
      setIsLoading(false);
      throw new Error(getAuthErrorMessage(error.code, t));
    }
  }, [t, fetchAndSetUser]);
  
  const loginWithApple = useCallback(async () => {
    setIsLoading(true);
    const provider = new OAuthProvider('apple.com');
    // This is a placeholder as Apple Sign-In requires more configuration
    console.warn("Apple Sign-In is simulated. Using Google Sign-In flow for now.");
    try {
      const result = await signInWithPopup(auth, new GoogleAuthProvider()); // Simulating with Google
      const firebaseUser = result.user;
      const userRef = doc(db, "users", firebaseUser.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        const newUserDocData = initializeNewUserDocument(firebaseUser);
        await setDoc(userRef, newUserDocData);
        await fetchAndSetUser(firebaseUser);
        await notifyAdminsOfNewUser(newUserDocData); 
      } else {
        await fetchAndSetUser(firebaseUser);
      }
    } catch (error: any) {
      console.error("Apple (simulated) login error:", error);
      setIsLoading(false);
      throw new Error(getAuthErrorMessage(error.code, t));
    }
  }, [t, fetchAndSetUser]);

  const loginWithEmailPassword = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await fetchAndSetUser(userCredential.user);
    } catch (error: any) {
      console.error("Email login error:", error);
      setIsLoading(false);
      throw new Error(getAuthErrorMessage(error.code, t));
    }
  }, [t, fetchAndSetUser]);

  const signUpWithEmailPassword = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const displayName = email.split('@')[0]; 
      await updateProfile(userCredential.user, { displayName });
      
      const newUserDocData = initializeNewUserDocument(userCredential.user);
      newUserDocData.displayName = displayName; 

      const userRef = doc(db, "users", userCredential.user.uid);
      await setDoc(userRef, newUserDocData); // Create doc first
      await fetchAndSetUser(userCredential.user); // Then fetch and set
      console.log("New user signed up with email, notifying admins for UID:", newUserDocData.uid);
      await notifyAdminsOfNewUser(newUserDocData); 
    } catch (error: any) {
      console.error("Email sign-up error:", error);
      setIsLoading(false);
      throw new Error(getAuthErrorMessage(error.code, t)); 
    }
  }, [t, fetchAndSetUser]);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await signOut(auth);
      // setUser(null) and setIsAdmin(false) will be handled by onAuthStateChanged -> fetchAndSetUser
      if (pathname.startsWith('/admin') || (isAdmin && pathname !== '/login')) {
         router.push('/login'); 
      } else if (pathname !== '/login' && pathname !== '/') { 
        router.push('/');
      }
    } catch (error: any) {
      console.error("Logout error:", error);
      throw new Error(getAuthErrorMessage(error.code, t));
    } finally {
        // Ensure loading is false even on logout error, though onAuthStateChanged should also handle it
        // fetchAndSetUser(null) called by onAuthStateChanged handles this too.
    }
  }, [pathname, isAdmin, router, t]);
  
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
      isLoading,
      refreshUser // Provide the refresh function
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

    