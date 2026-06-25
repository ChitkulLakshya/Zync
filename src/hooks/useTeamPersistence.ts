import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase';
import {
  doc,
  setDoc,
  updateDoc,
  arrayUnion,
  query,
  collection,
  where,
  onSnapshot,
  getDocs,
} from 'firebase/firestore';

export interface TeamMetadata {
  id: string;
  name: string;
  leaderId: string;
  ownerId: string;
  members: string[];
  inviteCode: string;
  logoId?: string;
  updatedAt?: string;
  createdAt?: string;
}

export const useTeamPersistence = (userId: string | undefined) => {
  const [myTeams, setMyTeams] = useState<TeamMetadata[]>([]);
  const [loading, setLoading] = useState(true);

  const normalizeUid = (value: any): string => {
    if (!value) {
      return '';
    }
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'object') {
      return String(value.uid || value.id || value._id || '');
    }
    return String(value);
  };

  const normalizeTeamPayload = (team: any, fallbackUserId?: string): TeamMetadata | null => {
    const id = String(team?.id || team?._id || team?.teamId || '');
    if (!id) {
      return null;
    }

    const ownerId = normalizeUid(
      team?.ownerId ||
        team?.ownerUid ||
        team?.leaderId ||
        team?.createdBy ||
        team?.createdByUid ||
        fallbackUserId
    );

    const rawMembers = Array.isArray(team?.members) ? team.members : [];
    const members = Array.from(
      new Set(
        [...rawMembers.map((m: any) => normalizeUid(m)).filter(Boolean), ownerId].filter(Boolean)
      )
    );

    return {
      id,
      name: team?.name || 'Team',
      ownerId,
      leaderId: ownerId,
      members,
      inviteCode: String(team?.inviteCode || ''),
      logoId: team?.logoId || 'rocket',
      createdAt: team?.createdAt,
      updatedAt: new Date().toISOString(),
    };
  };

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }


    const q = query(collection(db, 'teams'), where('members', 'array-contains', userId));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const teams: TeamMetadata[] = [];
        snapshot.forEach((docSnapshot) => {
          const normalized = normalizeTeamPayload({ id: docSnapshot.id, ...docSnapshot.data() });
          if (normalized) {
            teams.push(normalized);
          }
        });
        setMyTeams(teams);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching teams from Firestore:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  const upsertTeamSync = useCallback(async (teamPayload: any, fallbackUserId?: string) => {
    const team = normalizeTeamPayload(teamPayload, fallbackUserId);
    if (!team) {
      return;
    }

    try {
      await setDoc(
        doc(db, 'teams', team.id),
        {
          name: team.name,
          ownerId: team.ownerId,
          leaderId: team.ownerId,
          members: team.members,
          inviteCode: team.inviteCode,
          logoId: team.logoId || 'rocket',
          createdAt: team.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      if (team.ownerId) {
        await setDoc(
          doc(db, 'users', team.ownerId),
          {
            uid: team.ownerId,
            ownedTeamIds: arrayUnion(team.id),
            teamMemberships: arrayUnion(team.id),
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }

      for (const memberId of team.members) {
        await setDoc(
          doc(db, 'users', memberId),
          {
            uid: memberId,
            teamMemberships: arrayUnion(team.id),
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }
    } catch (error) {
      console.error('Error syncing team to Firestore:', error);
    }
  }, []);

  const createTeamSync = useCallback(
    async (teamId: string, name: string, leaderId: string, inviteCode: string, logoId?: string) => {
      await upsertTeamSync(
        {
          id: teamId,
          name,
          ownerId: leaderId,
          leaderId,
          members: [leaderId],
          inviteCode,
          logoId: logoId || 'rocket',
        },
        leaderId
      );
    },
    [upsertTeamSync]
  );

  const joinTeamSync = useCallback(
    async (teamOrInviteCode: any, userId: string) => {
      try {
        if (typeof teamOrInviteCode === 'object' && teamOrInviteCode) {
          const normalized = normalizeTeamPayload(teamOrInviteCode, userId);
          if (normalized) {
            await upsertTeamSync(normalized, userId);
            await updateDoc(doc(db, 'teams', normalized.id), {
              members: arrayUnion(userId),
              updatedAt: new Date().toISOString(),
            });
            await setDoc(
              doc(db, 'users', userId),
              {
                uid: userId,
                teamMemberships: arrayUnion(normalized.id),
                updatedAt: new Date().toISOString(),
              },
              { merge: true }
            );
            return;
          }
        }

        const inviteCode = String(teamOrInviteCode || '');
        if (!inviteCode) {
          return;
        }


        const q = query(collection(db, 'teams'), where('inviteCode', '==', inviteCode));
        const snapshot = await getDocs(q);
        for (const teamDoc of snapshot.docs) {
          await updateDoc(doc(db, 'teams', teamDoc.id), {
            members: arrayUnion(userId),
            updatedAt: new Date().toISOString(),
          });
          await setDoc(
            doc(db, 'users', userId),
            {
              uid: userId,
              teamMemberships: arrayUnion(teamDoc.id),
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        }
      } catch (error) {
        console.error('Error joining team in Firestore:', error);
      }
    },
    [upsertTeamSync]
  );

  const syncTeamsFromApi = useCallback(
    async (teams: any[], fallbackUserId?: string) => {
      try {
        if (!Array.isArray(teams) || teams.length === 0) {
          return;
        }
        for (const team of teams) {
          await upsertTeamSync(team, fallbackUserId);
        }
      } catch (error) {
        console.error('Error syncing teams list to Firestore:', error);
      }
    },
    [upsertTeamSync]
  );

  return { myTeams, loading, createTeamSync, joinTeamSync, upsertTeamSync, syncTeamsFromApi };
};
