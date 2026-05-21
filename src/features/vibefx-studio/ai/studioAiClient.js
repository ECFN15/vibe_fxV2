import { httpsCallable } from 'firebase/functions';
import { auth, firebaseReady, functions } from '../../../lib/firebase';

export function getStudioAiRuntimeState() {
  if (!firebaseReady || !functions) {
    return {
      ready: false,
      reason: "Firebase Functions n'est pas configure.",
      user: auth?.currentUser || null,
    };
  }
  return {
    ready: true,
    reason: '',
    user: auth?.currentUser || null,
  };
}

export async function createStudioAiJob(payload) {
  if (!functions) {
    const error = new Error("Firebase Functions n'est pas configure.");
    error.code = 'firebase_not_configured';
    throw error;
  }
  const createJob = httpsCallable(functions, 'createAiJob');
  const result = await createJob(payload);
  return result.data;
}

