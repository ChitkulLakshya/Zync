import { useQuery } from '@tanstack/react-query';
import { auth } from '@/lib/firebase';
import { API_BASE_URL } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';

export interface Team {
  id: string;
  name: string;
  ownerId: string;
  members: string[];
  inviteCode?: string;
  [key: string]: any;
}

export interface UserData {
  id: string;
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  teamId?: Team | string | null;
  teamMemberships?: string[];
  closeFriends?: string[];
  timezone?: string | null;
  country?: string | null;
  countryCode?: string | null;
  city?: string | null;
  [key: string]: any;
}

export const useMe = () => {
  const [user, setUser] = useState<User | null>(auth.currentUser);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
  }, []);

  return useQuery<UserData | null>({
    queryKey: ['me', user?.uid],
    queryFn: async () => {
      if (!user) {
        return null;
      }

      const token = await user.getIdToken();
      const res = await fetch(`${API_BASE_URL}/api/users/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        if (res.status === 404) {
          return null;
        }
        throw new Error('Failed to fetch user data');
      }

      const data = await res.json();
      if (!data || typeof data !== 'object' || !data.uid) {
        throw new Error('Invalid user data');
      }


      if (data.teamId && typeof data.teamId === 'object' && data.teamId.id) {

      } else if (data.teamId && typeof data.teamId === 'object' && data.teamId._id) {
        data.teamId.id = data.teamId._id.toString();
      }

      return data;
    },
    enabled: !!user,

    staleTime: Number.POSITIVE_INFINITY,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
  });
};
