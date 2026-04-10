/**
 * Unit tests for groups-service gRPC handlers.
 * Mocks MySQL pool — no real DB required.
 */

jest.mock('../../src/config/logger', () => ({
  info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn(),
}));

const mockQuery = jest.fn();
jest.mock('../../src/config/db', () => ({ query: mockQuery }));

// uuid deterministic mock
jest.mock('uuid', () => ({ v4: jest.fn(() => 'test-uuid') }));

const handlers = require('../../src/handlers/groups');

function fakeCall(request) {
  return { request };
}

// ── createGroup ───────────────────────────────────────────────────────────────

describe('createGroup', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates group, adds creator as admin, creates #general channel', async () => {
    mockQuery.mockResolvedValue([{ affectedRows: 1 }]);
    const callback = jest.fn();

    await handlers.createGroup(
      fakeCall({ name: 'Dev Team', description: 'Devs', user_id: 'u-1' }),
      callback
    );

    expect(mockQuery).toHaveBeenCalledTimes(3);
    expect(callback).toHaveBeenCalledWith(null, expect.objectContaining({
      success: true,
      group: expect.objectContaining({ name: 'Dev Team', role: 'admin' }),
    }));
  });

  it('returns error when name is empty', async () => {
    const callback = jest.fn();
    await handlers.createGroup(fakeCall({ name: '', user_id: 'u-1' }), callback);

    expect(mockQuery).not.toHaveBeenCalled();
    expect(callback).toHaveBeenCalledWith(null, expect.objectContaining({
      success: false,
      error: expect.stringContaining('requerido'),
    }));
  });

  it('returns error on DB failure', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB error'));
    const callback = jest.fn();
    await handlers.createGroup(
      fakeCall({ name: 'Test', user_id: 'u-1' }),
      callback
    );
    expect(callback).toHaveBeenCalledWith(null, expect.objectContaining({ success: false }));
  });
});

// ── getGroups ─────────────────────────────────────────────────────────────────

describe('getGroups', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns list of groups for user', async () => {
    const rows = [
      { id: 'grp-1', name: 'Dev Team', description: 'Devs', created_by: 'u-1',
        role: 'admin', member_count: 2, last_message: '', last_message_at: null,
        created_at: new Date('2024-01-01') },
    ];
    mockQuery.mockResolvedValueOnce([rows]);
    const callback = jest.fn();

    await handlers.getGroups(fakeCall({ user_id: 'u-1' }), callback);

    expect(callback).toHaveBeenCalledWith(null, expect.objectContaining({
      success: true,
      groups: expect.arrayContaining([
        expect.objectContaining({ id: 'grp-1', name: 'Dev Team' }),
      ]),
    }));
  });

  it('returns error on DB failure', async () => {
    mockQuery.mockRejectedValueOnce(new Error('timeout'));
    const callback = jest.fn();
    await handlers.getGroups(fakeCall({ user_id: 'u-1' }), callback);
    expect(callback).toHaveBeenCalledWith(null, expect.objectContaining({ success: false }));
  });
});

// ── deleteGroup ───────────────────────────────────────────────────────────────

describe('deleteGroup', () => {
  beforeEach(() => jest.clearAllMocks());

  it('deletes group when user is admin', async () => {
    // First query: check admin role
    mockQuery.mockResolvedValueOnce([[{ role: 'admin' }]]);
    // Second: delete
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }]);

    const callback = jest.fn();
    await handlers.deleteGroup(fakeCall({ group_id: 'grp-1', user_id: 'u-1' }), callback);

    expect(callback).toHaveBeenCalledWith(null, expect.objectContaining({ success: true }));
  });

  it('returns 403 equivalent when user is not admin', async () => {
    mockQuery.mockResolvedValueOnce([[{ role: 'member' }]]);
    const callback = jest.fn();
    await handlers.deleteGroup(fakeCall({ group_id: 'grp-1', user_id: 'u-2' }), callback);

    expect(callback).toHaveBeenCalledWith(null, expect.objectContaining({
      success: false,
      error: expect.stringContaining('admin'),
    }));
  });

  it('returns error when group not found', async () => {
    mockQuery.mockResolvedValueOnce([[]]); // no rows
    const callback = jest.fn();
    await handlers.deleteGroup(fakeCall({ group_id: 'unknown', user_id: 'u-1' }), callback);
    expect(callback).toHaveBeenCalledWith(null, expect.objectContaining({ success: false }));
  });
});

// ── getChannels ───────────────────────────────────────────────────────────────

describe('getChannels', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns channels for a group', async () => {
    const rows = [
      { id: 'ch-1', group_id: 'grp-1', name: 'general', description: '',
        created_by: 'u-1', created_at: new Date(), last_message: '' },
    ];
    mockQuery.mockResolvedValueOnce([rows]);
    const callback = jest.fn();

    await handlers.getChannels(fakeCall({ group_id: 'grp-1' }), callback);

    expect(callback).toHaveBeenCalledWith(null, expect.objectContaining({
      success: true,
      channels: expect.arrayContaining([
        expect.objectContaining({ id: 'ch-1', name: 'general' }),
      ]),
    }));
  });
});

// ── createChannel ─────────────────────────────────────────────────────────────

describe('createChannel', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates a channel', async () => {
    // Check admin role
    mockQuery.mockResolvedValueOnce([[{ role: 'admin' }]]);
    // Insert
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }]);

    const callback = jest.fn();
    await handlers.createChannel(
      fakeCall({ group_id: 'grp-1', name: 'backend', description: '', user_id: 'u-1' }),
      callback
    );

    expect(callback).toHaveBeenCalledWith(null, expect.objectContaining({ success: true }));
  });

  it('returns error when name is empty', async () => {
    const callback = jest.fn();
    await handlers.createChannel(
      fakeCall({ group_id: 'grp-1', name: '', user_id: 'u-1' }),
      callback
    );
    expect(callback).toHaveBeenCalledWith(null, expect.objectContaining({
      success: false,
      error: expect.stringContaining('requerido'),
    }));
  });
});
