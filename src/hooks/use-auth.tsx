
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
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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

  const loginWithGoogle = async () => {
    setIsLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      // onAuthStateChanged will handle setting user and redirecting if needed
      router.push('/');
    } catch (error) {
      console.error("Google login error:", error);
      // Handle error (e.g., show toast)
    } finally {
      // setIsLoading(false); // onAuthStateChanged handles final loading state
    }
  };
  
  const loginWithApple = async () => {
    // Placeholder: Apple Sign-In is more complex and requires specific setup.
    // For now, this can show a message or also trigger Google Sign-In for demo.
    console.warn("Apple Sign-In is not fully implemented. Using Google Sign-In as a placeholder.");
    await loginWithGoogle(); 
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await signOut(auth);
      // onAuthStateChanged will set user to null
       if (pathname !== '/login' && pathname !== '/') {
        router.push('/');
      } else if (pathname !== '/login') {
        router.push('/login'); // Or simply router.push('/')
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
       // setIsLoading(false); // onAuthStateChanged handles final loading state
    }
  };
  
  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, loginWithGoogle, loginWithApple, logout, isLoading }}>
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
