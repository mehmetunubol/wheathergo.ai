
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
  // signInWithRedirect, // Alternative for mobile
  // OAuthProvider // For Apple, requires more setup
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface User {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL?: string | null; 
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  loginWithGoogle: () => Promise<void>;
  loginWithApple: () => Promise<void>; // Placeholder for now
  loginWithEmailPassword: (email: string, password: string) => Promise<void>;
  signUpWithEmailPassword: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to map Firebase error codes to user-friendly messages
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
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        const userRef = doc(db, "users", firebaseUser.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          // Create user document if it doesn't exist
          await setDoc(userRef, {
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            createdAt: new Date().toISOString(),
            photoURL: firebaseUser.photoURL,
          });
        }
        setUser({ 
          uid: firebaseUser.uid, 
          displayName: firebaseUser.displayName, 
          email: firebaseUser.email,
          photoURL: firebaseUser.photoURL,
        });
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAuthSuccess = () => {
    router.push('/');
  };

  const loginWithGoogle = async () => {
    setIsLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      // onAuthStateChanged will handle setting user and redirecting if needed
      handleAuthSuccess();
    } catch (error: any) {
      console.error("Google login error:", error);
      setIsLoading(false); // Ensure loading is false on error
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
      handleAuthSuccess();
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
      // Set a default display name
      const displayName = email.split('@')[0];
      await updateProfile(userCredential.user, { displayName });
      
      // Ensure Firestore document is created for new email/password user
      const userRef = doc(db, "users", userCredential.user.uid);
      await setDoc(userRef, {
        email: userCredential.user.email,
        displayName: displayName,
        createdAt: new Date().toISOString(),
        photoURL: null, // No photoURL for email/password sign-up by default
      }, { merge: true }); // Use merge if there's a chance of race condition with onAuthStateChanged

      handleAuthSuccess();
    } catch (error: any) {
      console.error("Email sign-up error:", error);
      setIsLoading(false);
      throw new Error(getAuthErrorMessage(error.code));
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await signOut(auth);
      if (pathname !== '/login' && pathname !== '/') {
        router.push('/');
      } else if (pathname !== '/login') {
        router.push('/login');
      }
    } catch (error: any) {
      console.error("Logout error:", error);
      setIsLoading(false); // Ensure loading is false on error
      throw new Error(getAuthErrorMessage(error.code));
    }
  };
  
  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      user, 
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
