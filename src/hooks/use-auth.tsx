
"use client";

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { auth, db } from '@/lib/firebase'; // Import Firebase auth and db
import { 
  onAuthStateChanged, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut,
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { User } from '@/types'; // Import our User type

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  isAdmin: boolean; // Added isAdmin
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

        if (!userSnap.exists()) {
          // Create user document if it doesn't exist
          const newUserDocData = {
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            createdAt: new Date().toISOString(),
            photoURL: firebaseUser.photoURL,
            isAdmin: false, // Default isAdmin to false for new users
          };
          await setDoc(userRef, newUserDocData);
          userData = {
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName,
            email: firebaseUser.email,
            photoURL: firebaseUser.photoURL,
            isAdmin: false,
          };
          userIsAdmin = false;
        } else {
          const firestoreData = userSnap.data();
          userData = {
            uid: firebaseUser.uid,
            displayName: firestoreData.displayName || firebaseUser.displayName,
            email: firestoreData.email || firebaseUser.email,
            photoURL: firestoreData.photoURL || firebaseUser.photoURL,
            isAdmin: firestoreData.isAdmin || false,
          };
          userIsAdmin = firestoreData.isAdmin || false;
        }
        setUser(userData);
        setIsAdmin(userIsAdmin);
      } else {
        setUser(null);
        setIsAdmin(false);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAuthSuccess = () => {
    // Redirect to home, unless they are trying to access admin and are admin
    if (pathname.startsWith('/admin') && isAdmin) {
        // Stay or go to admin dashboard if coming from login
        if (pathname === '/login') router.push('/admin');
        // else, they are already in admin, do nothing or refresh data
    } else if (pathname === '/login' || pathname.startsWith('/admin')) { 
        router.push('/');
    }
    // For other pages, onAuthStateChanged handles keeping them there or redirecting if needed.
  };

  const loginWithGoogle = async () => {
    setIsLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;
      // Ensure user document is created/updated with isAdmin: false if new
      const userRef = doc(db, "users", firebaseUser.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          createdAt: new Date().toISOString(),
          photoURL: firebaseUser.photoURL,
          isAdmin: false, // Explicitly set isAdmin to false
        });
      }
      // onAuthStateChanged will handle setting user and admin state
      // handleAuthSuccess(); // onAuthStateChanged will handle this implicitly now
    } catch (error: any) {
      console.error("Google login error:", error);
      setIsLoading(false);
      throw new Error(getAuthErrorMessage(error.code));
    }
  };
  
  const loginWithApple = async () => {
    console.warn("Apple Sign-In is not fully implemented. Using Google Sign-In as a placeholder.");
    await loginWithGoogle(); 
  };

  const loginWithEmailPassword = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle setting user and admin state
      // handleAuthSuccess();
    } catch (error: any) {
      console.error("Email login error:", error);
      setIsLoading(false);
      throw new Error(getAuthErrorMessage(error.code));
    }
  };

  const signUpWithEmailPassword = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const displayName = email.split('@')[0];
      await updateProfile(userCredential.user, { displayName });
      
      const userRef = doc(db, "users", userCredential.user.uid);
      await setDoc(userRef, {
        email: userCredential.user.email,
        displayName: displayName,
        createdAt: new Date().toISOString(),
        photoURL: null, 
        isAdmin: false, // Default new sign-ups to isAdmin: false
      });
      // onAuthStateChanged will handle setting user and admin state
      // handleAuthSuccess();
    } catch (error: any) {
      console.error("Email sign-up error:", error);
      setIsLoading(false);
      throw new Error(getAuthErrorMessage(error.code));
    }
  };

  const logout = async () => {
    setIsLoading(true);
    const wasAdmin = isAdmin; // check if user was admin before logout
    try {
      await signOut(auth);
      // User state will be null, isAdmin will be false after onAuthStateChanged runs
      if (pathname.startsWith('/admin') || (wasAdmin && pathname !== '/login')) {
         router.push('/login'); // If admin logs out from admin, go to login
      } else if (pathname !== '/login' && pathname !== '/') {
        router.push('/');
      }
      // No explicit push to /login needed if not admin and not on specific pages
    } catch (error: any) {
      console.error("Logout error:", error);
      throw new Error(getAuthErrorMessage(error.code));
    } finally {
        setIsLoading(false); // Ensure loading is false after logout attempt
    }
  };
  
  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      user, 
      isAdmin, // Expose isAdmin
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
