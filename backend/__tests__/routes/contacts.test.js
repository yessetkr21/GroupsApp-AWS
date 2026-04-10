const request = require('supertest');
const express = require('express');

jest.mock('../../src/config/logger', () => ({
  info: jest.fn(), error: jest.fn(), warn: jest.fn(), http: jest.fn(), debug: jest.fn(),
}));

jest.mock('../../src/grpc/clients', () => ({
  messagesClient: {},
  groupsClient:   {},
  call: jest.fn(),
  initClients: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../src/middleware/auth', () => (req, _res, next) => {
  req.user = { id: 'user-1', username: 'alice' };
  next();
});

// Mock socket (contacts.js uses getIO)
jest.mock('../../src/socket', () => ({
  getIO: jest.fn().mockReturnValue({
    to: jest.fn().mockReturnValue({ emit: jest.fn() }),
  }),
}));

const { call } = require('../../src/grpc/clients');
const router   = require('../../src/routes/contacts');

const app = express();
app.use(express.json());
app.use('/api/contacts', router);

describe('GET /api/contacts', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns contacts list', async () => {
    const contacts = [{ id: 'c-1', username: 'bob' }];
    call.mockResolvedValueOnce({ success: true, contacts });
    const res = await request(app).get('/api/contacts');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(contacts);
  });
});

describe('GET /api/contacts/search', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 400 when q is missing', async () => {
    const res = await request(app).get('/api/contacts/search');
    expect(res.status).toBe(400);
    expect(call).not.toHaveBeenCalled();
  });

  it('searches users by query', async () => {
    const users = [{ id: 'u-2', username: 'bob' }];
    call.mockResolvedValueOnce({ success: true, users });
    const res = await request(app).get('/api/contacts/search?q=bo');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(users);
    expect(call).toHaveBeenCalledWith(
      expect.anything(), 'SearchUsers',
      expect.objectContaining({ query: 'bo', user_id: 'user-1' })
    );
  });
});

describe('POST /api/contacts', () => {
  beforeEach(() => jest.clearAllMocks());

  it('adds a contact and notifies via socket', async () => {
    const contact = { id: 'c-2' };
    call.mockResolvedValueOnce({
      success: true,
      contact,
      added_user_id: 'user-2',
      adder_info_json: JSON.stringify({ id: 'user-1', username: 'alice' }),
    });

    const res = await request(app).post('/api/contacts').send({ username: 'bob' });
    expect(res.status).toBe(201);
    expect(res.body.data).toEqual(contact);
  });

  it('returns 404 when user not found', async () => {
    call.mockResolvedValueOnce({ success: false, error: 'Usuario no encontrado' });
    const res = await request(app).post('/api/contacts').send({ username: 'unknown' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/contacts/:userId', () => {
  beforeEach(() => jest.clearAllMocks());

  it('deletes contact', async () => {
    call.mockResolvedValueOnce({ success: true, message: 'Contacto eliminado' });
    const res = await request(app).delete('/api/contacts/user-2');
    expect(res.status).toBe(200);
  });
});
