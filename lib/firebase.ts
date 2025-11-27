import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithCredential, 
  OAuthProvider, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  Auth,
  User as FirebaseUser,
  deleteUser
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp;
let auth: Auth;

export function initializeFirebase(): { app: FirebaseApp; auth: Auth } {
  console.log('[Firebase] Initializing...');
  
  const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'appId'];
  const missingKeys = requiredKeys.filter(key => !firebaseConfig[key as keyof typeof firebaseConfig]);
  
  if (missingKeys.length > 0) {
    console.error('[Firebase] Missing config keys:', missingKeys);
    throw new Error(`Firebase config missing: ${missingKeys.join(', ')}`);
  }
  
  if (getApps().length === 0) {
    console.log('[Firebase] Creating new app instance');
    app = initializeApp(firebaseConfig);
  } else {
    console.log('[Firebase] Using existing app instance');
    app = getApps()[0];
  }
  
  auth = getAuth(app);
  console.log('[Firebase] Initialized successfully');
  
  return { app, auth };
}

export function getFirebaseAuth(): Auth {
  if (!auth) {
    initializeFirebase();
  }
  return auth;
}

export async function signInWithAppleCredential(identityToken: string, nonce?: string): Promise<FirebaseUser> {
  console.log('[Firebase] Signing in with Apple credential...');
  
  const firebaseAuth = getFirebaseAuth();
  const provider = new OAuthProvider('apple.com');
  
  const credential = nonce 
    ? provider.credential({
        idToken: identityToken,
        rawNonce: nonce,
      })
    : provider.credential({
        idToken: identityToken,
      });
  
  try {
    const result = await signInWithCredential(firebaseAuth, credential);
    console.log('[Firebase] Sign in successful');
    console.log('[Firebase] User ID:', result.user.uid);
    console.log('[Firebase] Email:', result.user.email);
    return result.user;
  } catch (error) {
    console.error('[Firebase] Sign in error:', error);
    throw error;
  }
}

export async function signOut(): Promise<void> {
  console.log('[Firebase] Signing out...');
  const firebaseAuth = getFirebaseAuth();
  await firebaseSignOut(firebaseAuth);
  console.log('[Firebase] Sign out successful');
}

export async function deleteCurrentUser(): Promise<void> {
  console.log('[Firebase] Deleting user...');
  const firebaseAuth = getFirebaseAuth();
  const user = firebaseAuth.currentUser;
  
  if (user) {
    await deleteUser(user);
    console.log('[Firebase] User deleted');
  } else {
    console.log('[Firebase] No user to delete');
  }
}

export function getCurrentUser(): FirebaseUser | null {
  const firebaseAuth = getFirebaseAuth();
  return firebaseAuth.currentUser;
}

export function subscribeToAuthState(callback: (user: FirebaseUser | null) => void): () => void {
  const firebaseAuth = getFirebaseAuth();
  return onAuthStateChanged(firebaseAuth, callback);
}

export type { FirebaseUser };
