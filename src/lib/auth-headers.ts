import { auth } from './firebase';

export const getAuthHeaders = async (): Promise<Record<string, string>> => {
  const user = auth.currentUser;
  const token = user ? await user.getIdToken() : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
};

export const getAuthToken = async (): Promise<string> => {
  const user = auth.currentUser;
  if (!user) {throw new Error('Not authenticated');}
  return user.getIdToken();
};
