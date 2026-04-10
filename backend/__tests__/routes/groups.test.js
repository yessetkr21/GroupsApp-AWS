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

const { call } = require('../../src/grpc/clients');
const router   = require('../../src/routes/groups');

const app = express();
app.use(express.json());
app.use('/api/groups', router);

describe('POST /api/groups', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates a group and returns 201', async () => {
    const group = { id: 'grp-1', name: 'Dev Team' };
    call.mockResolvedValueOnce({ success: true, group });

    const res = await request(app)
      .post('/api/groups')
      .send({ name: 'Dev Team', description: 'Engineers' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual(group);
    expect(call).toHaveBeenCalledWith(
      expect.anything(), 'CreateGroup',
      expect.objectContaining({ name: 'Dev Team', user_id: 'user-1' })
    );
  });

  it('returns 400 when name is missing (gRPC says requerido)', async () => {
    call.mockResolvedValueOnce({ success: false, error: 'Nombre requerido' });

    const res = await request(app).post('/api/groups').send({});
    expect(res.status).toBe(400);
  });

  it('returns 500 on gRPC failure', async () => {
    call.mockRejectedValueOnce(new Error('gRPC unavailable'));
    const res = await request(app).post('/api/groups').send({ name: 'X' });
    expect(res.status).toBe(500);
  });
});

describe('GET /api/groups', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lists groups for authenticated user', async () => {
    const groups = [{ id: 'grp-1' }, { id: 'grp-2' }];
    call.mockResolvedValueOnce({ success: true, groups });

    const res = await request(app).get('/api/groups');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(groups);
  });
});

describe('GET /api/groups/:id', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 404 when group not found', async () => {
    call.mockResolvedValueOnce({ success: false, error: 'Grupo no encontrado' });
    const res = await request(app).get('/api/groups/unknown');
    expect(res.status).toBe(404);
  });

  it('returns group data', async () => {
    const group = { id: 'grp-1', name: 'Dev Team' };
    call.mockResolvedValueOnce({ success: true, group });
    const res = await request(app).get('/api/groups/grp-1');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(group);
  });
});

describe('DELETE /api/groups/:id', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 403 when user is not admin', async () => {
    call.mockResolvedValueOnce({ success: false, error: 'Solo admin puede eliminar' });
    const res = await request(app).delete('/api/groups/grp-1');
    expect(res.status).toBe(403);
  });

  it('deletes group successfully', async () => {
    call.mockResolvedValueOnce({ success: true, message: 'Eliminado' });
    const res = await request(app).delete('/api/groups/grp-1');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('POST /api/groups/:id/members', () => {
  beforeEach(() => jest.clearAllMocks());

  it('adds a member', async () => {
    call.mockResolvedValueOnce({ success: true, message: 'Miembro agregado' });
    const res = await request(app)
      .post('/api/groups/grp-1/members')
      .send({ username: 'bob' });
    expect(res.status).toBe(201);
  });

  it('returns 403 when not admin', async () => {
    call.mockResolvedValueOnce({ success: false, error: 'Solo admin puede agregar' });
    const res = await request(app)
      .post('/api/groups/grp-1/members')
      .send({ username: 'bob' });
    expect(res.status).toBe(403);
  });
});
