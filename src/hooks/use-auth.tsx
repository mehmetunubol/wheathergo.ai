
"use client";

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
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
import type { User } from '@/types';

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
          const newUserDocData = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            createdAt: new Date().toISOString(),
            photoURL: firebaseUser.photoURL,
            isAdmin: false,
            isActive: true, // Default to active
          };
          await setDoc(userRef, newUserDocData);
          userData = newUserDocData;
          userIsAdmin = false;
        } else {
          const firestoreData = userSnap.data();
          userData = {
            uid: firebaseUser.uid,
            displayName: firestoreData.displayName || firebaseUser.displayName,
            email: firestoreData.email || firebaseUser.email,
            photoURL: firestoreData.photoURL || firebaseUser.photoURL,
            isAdmin: firestoreData.isAdmin || false,
            isActive: firestoreData.isActive === undefined ? true : firestoreData.isActive, // Default to true if missing
            createdAt: firestoreData.createdAt || new Date().toISOString(), // Default if missing
          };
          userIsAdmin = firestoreData.isAdmin || false;
        }
        setUser(userData.isActive ? userData : null); // Only set user if active
        setIsAdmin(userData.isActive ? userIsAdmin : false); // Only set admin if active
        if (!userData.isActive) {
           console.log(`User ${userData.email} is inactive. Forcing logout.`);
           await signOut(auth); // Force sign out if user is marked inactive
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
        await setDoc(userRef, {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          createdAt: new Date().toISOString(),
          photoURL: firebaseUser.photoURL,
          isAdmin: false,
          isActive: true,
        });
      }
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
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        displayName: displayName,
        createdAt: new Date().toISOString(),
        photoURL: null, 
        isAdmin: false,
        isActive: true,
      });
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
      if (pathname.startsWith('/admin') || (isAdmin && pathname !== '/login')) {
         router.push('/login'); 
      } else if (pathname !== '/login' && pathname !== '/') {
        router.push('/');
      }
    } catch (error: any) {
      console.error("Logout error:", error);
      throw new Error(getAuthErrorMessage(error.code));
    } finally {
        setIsLoading(false);
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
