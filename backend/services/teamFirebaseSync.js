const { admin, getFirestoreAdmin } = require('./firebaseAdmin');

const normalizeUid = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') return String(value.uid || value.id || value._id || '');
  return String(value);
};

const extractOwnerUid = (team) => normalizeUid(
  team?.ownerId ||
  team?.ownerUid ||
  team?.leaderId ||
  team?.createdBy ||
  team?.createdByUid ||
  team?.owner?.uid ||
  team?.owner?.id ||
  team?.owner?._id
);

const extractTeamId = (teamOrId) => {
  if (!teamOrId) return '';
  if (typeof teamOrId === 'string') return teamOrId;
  return String(teamOrId.id || teamOrId._id || teamOrId.teamId || '');
};

const toIsoOrNow = (value) => {
  if (!value) return new Date().toISOString();
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
};

const safeArray = (value) => (Array.isArray(value) ? value : []);

const upsertTeamSnapshot = async (team) => {
  const db = getFirestoreAdmin();
  if (!db || !team) return;

  const teamId = extractTeamId(team);
  if (!teamId) return;

  const ownerId = extractOwnerUid(team);
  const memberIds = safeArray(team.members).map(normalizeUid).filter(Boolean);
  const members = Array.from(new Set([...memberIds, ownerId].filter(Boolean)));
  const now = new Date().toISOString();

  const payload = {
    name: team.name || 'Team',
    ownerId,
    leaderId: ownerId,
    members,
    inviteCode: team.inviteCode || '',
    logoId: team.logoId || 'rocket',
    type: team.type || 'Other',
    createdAt: toIsoOrNow(team.createdAt),
    updatedAt: now,
    syncedAt: now,
  };

  await db.collection('teams').doc(teamId).set(payload, { merge: true });

  if (ownerId) {
    await db.collection('users').doc(ownerId).set({
      uid: ownerId,
      ownedTeamIds: admin.firestore.FieldValue.arrayUnion(teamId),
      teamMemberships: admin.firestore.FieldValue.arrayUnion(teamId),
      updatedAt: now,
    }, { merge: true });
  }

  for (const memberId of members) {
    await db.collection('users').doc(memberId).set({
      uid: memberId,
      teamMemberships: admin.firestore.FieldValue.arrayUnion(teamId),
      updatedAt: now,
    }, { merge: true });
  }
};

const addMemberToTeam = async (teamIdOrObj, memberUid) => {
  const db = getFirestoreAdmin();
  if (!db) return;
  const teamId = extractTeamId(teamIdOrObj);
  const uid = normalizeUid(memberUid);
  if (!teamId || !uid) return;

  const now = new Date().toISOString();
  await db.collection('teams').doc(teamId).set({
    members: admin.firestore.FieldValue.arrayUnion(uid),
    updatedAt: now,
    syncedAt: now,
  }, { merge: true });

  await db.collection('users').doc(uid).set({
    uid,
    teamMemberships: admin.firestore.FieldValue.arrayUnion(teamId),
    updatedAt: now,
  }, { merge: true });
};

const removeMemberFromTeam = async (teamIdOrObj, memberUid) => {
  const db = getFirestoreAdmin();
  if (!db) return;
  const teamId = extractTeamId(teamIdOrObj);
  const uid = normalizeUid(memberUid);
  if (!teamId || !uid) return;

  const now = new Date().toISOString();
  await db.collection('teams').doc(teamId).set({
    members: admin.firestore.FieldValue.arrayRemove(uid),
    updatedAt: now,
    syncedAt: now,
  }, { merge: true });

  await db.collection('users').doc(uid).set({
    uid,
    teamMemberships: admin.firestore.FieldValue.arrayRemove(teamId),
    ownedTeamIds: admin.firestore.FieldValue.arrayRemove(teamId),
    updatedAt: now,
  }, { merge: true });
};

const transferTeamOwnership = async (teamIdOrObj, previousOwnerUid, nextOwnerUid) => {
  const db = getFirestoreAdmin();
  if (!db) return;
  const teamId = extractTeamId(teamIdOrObj);
  const prevOwner = normalizeUid(previousOwnerUid);
  const newOwner = normalizeUid(nextOwnerUid);
  if (!teamId || !newOwner) return;

  const now = new Date().toISOString();
  await db.collection('teams').doc(teamId).set({
    ownerId: newOwner,
    leaderId: newOwner,
    members: admin.firestore.FieldValue.arrayUnion(newOwner),
    updatedAt: now,
    syncedAt: now,
  }, { merge: true });

  if (prevOwner) {
    await db.collection('users').doc(prevOwner).set({
      uid: prevOwner,
      ownedTeamIds: admin.firestore.FieldValue.arrayRemove(teamId),
      updatedAt: now,
    }, { merge: true });
  }

  await db.collection('users').doc(newOwner).set({
    uid: newOwner,
    ownedTeamIds: admin.firestore.FieldValue.arrayUnion(teamId),
    teamMemberships: admin.firestore.FieldValue.arrayUnion(teamId),
    updatedAt: now,
  }, { merge: true });
};

const deleteTeamSnapshot = async (teamIdOrObj, memberUids = [], ownerUid) => {
  const db = getFirestoreAdmin();
  if (!db) return;
  const teamId = extractTeamId(teamIdOrObj);
  if (!teamId) return;

  const allMembers = Array.from(
    new Set([
      ...safeArray(memberUids).map(normalizeUid).filter(Boolean),
      normalizeUid(ownerUid),
    ].filter(Boolean))
  );

  const now = new Date().toISOString();
  await db.collection('teams').doc(teamId).delete();

  for (const uid of allMembers) {
    await db.collection('users').doc(uid).set({
      uid,
      teamMemberships: admin.firestore.FieldValue.arrayRemove(teamId),
      ownedTeamIds: admin.firestore.FieldValue.arrayRemove(teamId),
      updatedAt: now,
    }, { merge: true });
  }
};

module.exports = {
  upsertTeamSnapshot,
  addMemberToTeam,
  removeMemberFromTeam,
  transferTeamOwnership,
  deleteTeamSnapshot,
};
