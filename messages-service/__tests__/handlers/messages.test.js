/**
 * Unit tests for messages-service gRPC handlers.
 * Mocks the MySQL pool so no real DB is needed.
 */

jest.mock('../../src/config/logger', () => ({
  info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn(),
}));

const mockQuery = jest.fn();
jest.mock('../../src/config/db', () => ({ query: mockQuery }));

const { getGroupMessages, getChannelMessages, getDirectMessages } =
  require('../../src/handlers/messages');

// Helper: build a fake gRPC call object
function fakeCall(request) {
  return { request };
}

describe('getGroupMessages', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns messages for a group', async () => {
    const rows = [
      {
        id: 'msg-1', sender_id: 'u-1', sender_username: 'alice',
        sender_avatar: '', group_id: 'grp-1', channel_id: null,
        receiver_id: null, content: 'hello', message_type: 'text',
        file_url: null, file_name: null, status: 'sent',
        created_at: new Date('2024-01-01'), is_read: 0,
      },
    ];
    mockQuery.mockResolvedValueOnce([rows]);

    const callback = jest.fn();
    await getGroupMessages(fakeCall({ group_id: 'grp-1', limit: 50, before: '' }), callback);

    expect(callback).toHaveBeenCalledWith(null, expect.objectContaining({
      success: true,
      messages: expect.arrayContaining([
        expect.objectContaining({ id: 'msg-1', content: 'hello' }),
      ]),
    }));
  });

  it('applies before filter when provided', async () => {
    mockQuery.mockResolvedValueOnce([[]]);
    const callback = jest.fn();
    await getGroupMessages(
      fakeCall({ group_id: 'grp-1', limit: 10, before: '2024-01-02' }),
      callback
    );

    const [query, params] = mockQuery.mock.calls[0];
    expect(query).toContain('gm.created_at <');
    expect(params).toContain('2024-01-02');
  });

  it('returns error response on DB failure', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB down'));
    const callback = jest.fn();
    await getGroupMessages(fakeCall({ group_id: 'grp-1', limit: 50, before: '' }), callback);
    expect(callback).toHaveBeenCalledWith(null, expect.objectContaining({
      success: false,
      error: expect.any(String),
    }));
  });
});

describe('getChannelMessages', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns messages for a channel', async () => {
    const rows = [
      {
        id: 'msg-2', sender_id: 'u-1', sender_username: 'alice',
        sender_avatar: '', group_id: 'grp-1', channel_id: 'ch-1',
        receiver_id: null, content: 'channel msg', message_type: 'text',
        file_url: null, file_name: null, status: 'sent',
        created_at: new Date('2024-01-01'), is_read: 0,
      },
    ];
    mockQuery.mockResolvedValueOnce([rows]);

    const callback = jest.fn();
    await getChannelMessages(fakeCall({ channel_id: 'ch-1', limit: 50, before: '' }), callback);

    expect(callback).toHaveBeenCalledWith(null, expect.objectContaining({
      success: true,
      messages: expect.arrayContaining([
        expect.objectContaining({ id: 'msg-2', channel_id: 'ch-1' }),
      ]),
    }));
  });

  it('returns error on DB failure', async () => {
    mockQuery.mockRejectedValueOnce(new Error('timeout'));
    const callback = jest.fn();
    await getChannelMessages(fakeCall({ channel_id: 'ch-1', limit: 50, before: '' }), callback);
    expect(callback).toHaveBeenCalledWith(null, expect.objectContaining({ success: false }));
  });
});

describe('getDirectMessages', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns direct messages between two users', async () => {
    const rows = [
      {
        id: 'dm-1', sender_id: 'u-1', sender_username: 'alice',
        sender_avatar: '', group_id: null, channel_id: null,
        receiver_id: 'u-2', content: 'hi!', message_type: 'text',
        file_url: null, file_name: null, status: 'delivered',
        created_at: new Date('2024-01-01'), is_read: 0,
      },
    ];
    mockQuery.mockResolvedValueOnce([rows]);

    const callback = jest.fn();
    await getDirectMessages(
      fakeCall({ user_id: 'u-1', other_user_id: 'u-2', limit: 50, before: '' }),
      callback
    );

    expect(callback).toHaveBeenCalledWith(null, expect.objectContaining({
      success: true,
      messages: expect.arrayContaining([
        expect.objectContaining({ id: 'dm-1', receiver_id: 'u-2' }),
      ]),
    }));
  });

  it('marks is_read=1 messages as status=read', async () => {
    const rows = [
      {
        id: 'dm-2', sender_id: 'u-1', sender_username: 'alice',
        sender_avatar: '', group_id: null, channel_id: null,
        receiver_id: 'u-2', content: 'seen?', message_type: 'text',
        file_url: null, file_name: null, status: 'delivered',
        created_at: new Date('2024-01-01'), is_read: 1,
      },
    ];
    mockQuery.mockResolvedValueOnce([rows]);

    const callback = jest.fn();
    await getDirectMessages(
      fakeCall({ user_id: 'u-1', other_user_id: 'u-2', limit: 50, before: '' }),
      callback
    );

    const [, response] = callback.mock.calls[0];
    expect(response.messages[0].status).toBe('read');
  });

  it('returns error on DB failure', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB error'));
    const callback = jest.fn();
    await getDirectMessages(
      fakeCall({ user_id: 'u-1', other_user_id: 'u-2', limit: 50, before: '' }),
      callback
    );
    expect(callback).toHaveBeenCalledWith(null, expect.objectContaining({ success: false }));
  });
});
