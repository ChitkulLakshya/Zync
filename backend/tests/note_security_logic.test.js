import { describe, it, expect, mock } from 'bun:test';

const mockNotes = [
  { id: '1', title: 'Secret Note', ownerId: 'victim', folderId: null },
  { id: '2', title: 'My Note', ownerId: 'me', folderId: null },
];

const prisma = {
  note: {
    findMany: mock((args) => {
      const query = args.where;
      return Promise.resolve(
        mockNotes.filter((n) => {
          if (query.OR) {
            return query.OR.some(
              (c) =>
                c.ownerId === n.ownerId ||
                (c.folderId === n.folderId && n.folderId !== null)
            );
          }
          if (query.folderId) return n.folderId === query.folderId;
          return false;
        })
      );
    }),
  },
  folder: {
    findUnique: mock(() => Promise.resolve(null)),
    findMany: mock(() => Promise.resolve([])),
  },
};

const fixedHandler = async (req, res) => {
  try {
    const userId = req.user ? req.user.uid : null;
    const { folderId } = req.query;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    if (folderId && typeof folderId !== 'string') {
      return res.status(400).json({ error: 'Invalid Folder ID format' });
    }

    let where = {};

    if (folderId) {
      const folder = await prisma.folder.findUnique({
        where: { id: folderId },
      });
      if (folder) {
        const isOwner = folder.ownerId === userId;
        const isCollaborator =
          folder.collaborators && folder.collaborators.includes(userId);

        if (isOwner || isCollaborator) {
          where = { folderId };
        } else {
          return res
            .status(403)
            .json({ error: 'Access denied to this folder' });
        }
      } else {
        return res.status(404).json({ error: 'Folder not found' });
      }
    } else {
      const sharedFolders = await prisma.folder.findMany({
        where: { collaborators: { has: userId } },
        select: { id: true },
      });
      const sharedFolderIds = sharedFolders.map((f) => f.id);

      where = {
        OR: [
          { ownerId: userId },
          { folderId: { in: sharedFolderIds } },
          { collaborators: { has: userId } },
        ],
      };
    }

    const notes = await prisma.note.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    });
    res.json(notes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

describe('Fixed IDOR Vulnerability (Handler Logic)', () => {
  it('uses authenticated user ID instead of query param', async () => {
    const req = {
      query: { userId: 'victim' },
      user: { uid: 'me' },
    };
    const res = {
      status: mock(() => res),
      json: mock(),
    };

    await fixedHandler(req, res);

    expect(prisma.note.findMany).toHaveBeenCalled();
    const callArgs = prisma.note.findMany.mock.calls[0][0];

    expect(callArgs.where.OR).toBeDefined();
    const ownerIdCheckMe = callArgs.where.OR.find((c) => c.ownerId === 'me');
    expect(ownerIdCheckMe).toBeDefined();

    const ownerIdCheckVictim = callArgs.where.OR.find(
      (c) => c.ownerId === 'victim'
    );
    expect(ownerIdCheckVictim).toBeUndefined();

    expect(res.json).toHaveBeenCalled();

    const result = res.json.mock.calls[0][0];
    expect(result).toHaveLength(1);
    expect(result[0].ownerId).toBe('me');
  });

  it('returns 401 if not authenticated', async () => {
    const req = {
      query: { userId: 'victim' },
      user: null,
    };
    const res = {
      status: mock(() => res),
      json: mock(),
    };

    await fixedHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });
});
