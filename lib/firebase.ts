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
import { 
  getFirestore, 
  Firestore, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCscmFoWxkLzJaI7Ir3jkxp3Gko0lS0Hz0",
  authDomain: "goalforge-ai-data.firebaseapp.com",
  projectId: "goalforge-ai-data",
  storageBucket: "goalforge-ai-data.firebasestorage.app",
  messagingSenderId: "770805155894",
  appId: "1:770805155894:web:79d078787b0c11aff93097"
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

export function initializeFirebase(): { app: FirebaseApp; auth: Auth; db: Firestore } {
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
  db = getFirestore(app);
  console.log('[Firebase] Initialized successfully (Auth + Firestore)');
  
  return { app, auth, db };
}

export function getFirebaseAuth(): Auth {
  if (!auth) {
    initializeFirebase();
  }
  return auth;
}

export function getFirebaseDB(): Firestore {
  if (!db) {
    initializeFirebase();
  }
  return db;
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

export async function saveUserProfile(userId: string, data: any): Promise<void> {
  console.log('[Firebase] Saving user profile:', userId);
  const firestore = getFirebaseDB();
  const userRef = doc(firestore, 'users', userId);
  
  await setDoc(userRef, {
    ...data,
    updatedAt: serverTimestamp(),
  }, { merge: true });
  
  console.log('[Firebase] User profile saved');
}

export async function getUserProfile(userId: string): Promise<any | null> {
  console.log('[Firebase] Getting user profile:', userId);
  const firestore = getFirebaseDB();
  const userRef = doc(firestore, 'users', userId);
  
  const docSnap = await getDoc(userRef);
  
  if (docSnap.exists()) {
    console.log('[Firebase] User profile found');
    return docSnap.data();
  }
  
  console.log('[Firebase] User profile not found');
  return null;
}

export async function updateUserProfile(userId: string, data: any): Promise<void> {
  console.log('[Firebase] Updating user profile:', userId);
  const firestore = getFirebaseDB();
  const userRef = doc(firestore, 'users', userId);
  
  await updateDoc(userRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
  
  console.log('[Firebase] User profile updated');
}

export async function deleteUserProfile(userId: string): Promise<void> {
  console.log('[Firebase] Deleting user profile:', userId);
  const firestore = getFirebaseDB();
  const userRef = doc(firestore, 'users', userId);
  
  await deleteDoc(userRef);
  console.log('[Firebase] User profile deleted');
}

export async function saveUserGoals(userId: string, goals: any[]): Promise<void> {
  console.log('[Firebase] Saving goals:', userId, goals.length);
  const firestore = getFirebaseDB();
  const userRef = doc(firestore, 'users', userId);
  
  const cleanedGoals = removeUndefined(goals);
  
  await setDoc(userRef, {
    goals: cleanedGoals,
    goalsUpdatedAt: serverTimestamp(),
  }, { merge: true });
  
  console.log('[Firebase] Goals saved');
}

export async function getUserGoals(userId: string): Promise<any[]> {
  console.log('[Firebase] Getting goals:', userId);
  const firestore = getFirebaseDB();
  const userRef = doc(firestore, 'users', userId);
  
  const docSnap = await getDoc(userRef);
  
  if (docSnap.exists() && docSnap.data().goals) {
    console.log('[Firebase] Goals found:', docSnap.data().goals.length);
    return docSnap.data().goals;
  }
  
  console.log('[Firebase] No goals found');
  return [];
}

export async function saveUserTasks(userId: string, tasks: any[]): Promise<void> {
  console.log('[Firebase] Saving tasks:', userId, tasks.length);
  const firestore = getFirebaseDB();
  const userRef = doc(firestore, 'users', userId);
  
  const cleanedTasks = removeUndefined(tasks);
  
  await setDoc(userRef, {
    tasks: cleanedTasks,
    tasksUpdatedAt: serverTimestamp(),
  }, { merge: true });
  
  console.log('[Firebase] Tasks saved');
}

export async function getUserTasks(userId: string): Promise<any[]> {
  console.log('[Firebase] Getting tasks:', userId);
  const firestore = getFirebaseDB();
  const userRef = doc(firestore, 'users', userId);
  
  const docSnap = await getDoc(userRef);
  
  if (docSnap.exists() && docSnap.data().tasks) {
    console.log('[Firebase] Tasks found:', docSnap.data().tasks.length);
    return docSnap.data().tasks;
  }
  
  console.log('[Firebase] No tasks found');
  return [];
}

export async function saveUserPomodoroSessions(userId: string, sessions: any[]): Promise<void> {
  console.log('[Firebase] Saving pomodoro sessions:', userId, sessions.length);
  const firestore = getFirebaseDB();
  const userRef = doc(firestore, 'users', userId);
  
  const cleanedSessions = removeUndefined(sessions);
  
  await setDoc(userRef, {
    pomodoroSessions: cleanedSessions,
    pomodoroUpdatedAt: serverTimestamp(),
  }, { merge: true });
  
  console.log('[Firebase] Pomodoro sessions saved');
}

export async function getUserPomodoroSessions(userId: string): Promise<any[]> {
  console.log('[Firebase] Getting pomodoro sessions:', userId);
  const firestore = getFirebaseDB();
  const userRef = doc(firestore, 'users', userId);
  
  const docSnap = await getDoc(userRef);
  
  if (docSnap.exists() && docSnap.data().pomodoroSessions) {
    console.log('[Firebase] Pomodoro sessions found:', docSnap.data().pomodoroSessions.length);
    return docSnap.data().pomodoroSessions;
  }
  
  console.log('[Firebase] No pomodoro sessions found');
  return [];
}

function removeUndefined(obj: any): any {
  if (obj === null || obj === undefined) {
    return null;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefined(item));
  }
  
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const key in obj) {
      const value = obj[key];
      if (value !== undefined) {
        cleaned[key] = removeUndefined(value);
      }
    }
    return cleaned;
  }
  
  return obj;
}

export async function saveUserFullProfile(userId: string, profile: any): Promise<void> {
  console.log('[Firebase] Saving full profile:', userId);
  const firestore = getFirebaseDB();
  const userRef = doc(firestore, 'users', userId);
  
  const cleanedProfile = removeUndefined(profile);
  
  await setDoc(userRef, {
    profile: cleanedProfile,
    profileUpdatedAt: serverTimestamp(),
  }, { merge: true });
  
  console.log('[Firebase] Full profile saved');
}

export async function getUserFullProfile(userId: string): Promise<any | null> {
  console.log('[Firebase] Getting full profile:', userId);
  const firestore = getFirebaseDB();
  const userRef = doc(firestore, 'users', userId);
  
  const docSnap = await getDoc(userRef);
  
  if (docSnap.exists() && docSnap.data().profile) {
    console.log('[Firebase] Full profile found');
    return docSnap.data().profile;
  }
  
  console.log('[Firebase] No full profile found');
  return null;
}

export async function saveSubscriptionInfo(userId: string, subscriptionInfo: any): Promise<void> {
  console.log('[Firebase] Saving subscription info:', userId);
  const firestore = getFirebaseDB();
  const userRef = doc(firestore, 'users', userId);
  
  const cleanedInfo = removeUndefined(subscriptionInfo);
  
  await setDoc(userRef, {
    subscription: cleanedInfo,
    subscriptionUpdatedAt: serverTimestamp(),
  }, { merge: true });
  
  console.log('[Firebase] Subscription info saved');
}

export async function getSubscriptionInfo(userId: string): Promise<any | null> {
  console.log('[Firebase] Getting subscription info:', userId);
  const firestore = getFirebaseDB();
  const userRef = doc(firestore, 'users', userId);
  
  const docSnap = await getDoc(userRef);
  
  if (docSnap.exists() && docSnap.data().subscription) {
    console.log('[Firebase] Subscription info found');
    return docSnap.data().subscription;
  }
  
  console.log('[Firebase] No subscription info found');
  return null;
}

export type { FirebaseUser, Timestamp };
