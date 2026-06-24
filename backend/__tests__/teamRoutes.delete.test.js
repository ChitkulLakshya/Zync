const express = require('express');
const request = require('supertest');

const createLeanChain = (result) => ({
  lean: jest.fn().mockResolvedValue(result),
});

jest.mock('../middleware/authMiddleware', () => (req, _res, next) => {
  req.user = { uid: 'owner_uid', email: 'owner@test.com' };
  next();
});

jest.mock('../models/User', () => ({
  findOne: jest.fn(),
  updateOne: jest.fn(),
}));

jest.mock('../models/Team', () => ({
  findById: jest.fn(),
  findByIdAndDelete: jest.fn(),
}));

jest.mock('../services/teamFirebaseSync', () => ({
  upsertTeamSnapshot: jest.fn(),
  addMemberToTeam: jest.fn(),
  removeMemberFromTeam: jest.fn(),
  transferTeamOwnership: jest.fn(),
  deleteTeamSnapshot: jest.fn(),
}));

jest.mock('../utils/cache', () => ({
  invalidate: jest.fn(),
}));

const User = jest.requireMock('../models/User');
const Team = jest.requireMock('../models/Team');
const cache = jest.requireMock('../utils/cache');
const { deleteTeamSnapshot } = jest.requireMock('../services/teamFirebaseSync');

const teamRoutes = require('../routes/teamRoutes');

const app = express();
app.use(express.json());
app.use('/api/teams', teamRoutes);

describe('Team delete route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deletes team, removes memberships, syncs firebase delete, and invalidates me-cache', async () => {
    const teamId = 'team_123';
    const ownerUid = 'owner_uid';
    const memberUid = 'member_uid';

    Team.findById.mockImplementation(() =>
      createLeanChain({
        _id: teamId,
        ownerId: ownerUid,
        members: [ownerUid, memberUid],
      })
    );
    Team.findByIdAndDelete.mockResolvedValue({ _id: teamId });

    // Include object-like IDs to ensure String(id) !== String(teamId) filtering is exercised.
    User.findOne.mockImplementation(({ uid }) => {
      if (uid === ownerUid) {
        return createLeanChain({
          uid: ownerUid,
          teamMemberships: [{ toString: () => teamId }, 'other_team'],
        });
      }
      if (uid === memberUid) {
        return createLeanChain({
          uid: memberUid,
          teamMemberships: [teamId, 'other_team'],
        });
      }
      return createLeanChain(null);
    });
    User.updateOne.mockResolvedValue({ acknowledged: true });
    cache.invalidate.mockResolvedValue();
    deleteTeamSnapshot.mockResolvedValue();

    const res = await request(app)
      .delete(`/api/teams/${teamId}`)
      .set('Authorization', 'Bearer valid_token');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Team deleted successfully' });

    expect(User.updateOne).toHaveBeenCalledTimes(2);
    expect(User.updateOne).toHaveBeenNthCalledWith(
      1,
      { uid: ownerUid },
      { $set: { teamMemberships: ['other_team'] } }
    );
    expect(User.updateOne).toHaveBeenNthCalledWith(
      2,
      { uid: memberUid },
      { $set: { teamMemberships: ['other_team'] } }
    );

    expect(Team.findByIdAndDelete).toHaveBeenCalledWith(teamId);
    expect(deleteTeamSnapshot).toHaveBeenCalledWith(
      teamId,
      [ownerUid, memberUid],
      ownerUid
    );
    expect(cache.invalidate).toHaveBeenCalledWith(
      'user:me:owner_uid',
      'user:me:member_uid'
    );
  });
});
