const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/User');
const sequalize = require('../src/config/database');
const bcrypt = require('bcrypt');

beforeAll(async () => {
  await sequalize.sync();
});

beforeEach(() => {
  return User.destroy({ truncate: { cascade: true } });
});

const userdata = { username: 'user1', email: 'user1@mail.com', password: 'P4ssword', inactive: false };

const addUser = async (user = { ...userdata }) => {
  const hash = await bcrypt.hash(user.password, 10);
  user.password = hash;
  return await User.create(user);
};

const updateUser = async (id = 5, body = null, options = {}) => {
  let agent = request(app);
  let token;
  if (options.auth) {
    const response = await agent.post('/api/1.0/auth').send(options.auth);
    token = response.body.token;
  }
  agent = request(app).put('/api/1.0/users/' + id);
  if (token) {
    agent.set('Authorization', `Bearer ${token}`);
  }
  if (options.token) {
    agent.set('Authorization', `Bearer ${options.token}`);
  }
  return agent.send(body);
};

describe('User update', () => {
  it('returns forbidden', async () => {
    const response = await updateUser();
    expect(response.status).toBe(403);
  });

  it('returns error body ', async () => {
    const response = await updateUser();
    expect(response.body.path).toBe('/api/1.0/users/5');
    expect(response.body.message).toBe('unauthroized user update');
  });

  it('returns forbidden when request send wiht incorrect email', async () => {
    await addUser();
    const response = await updateUser(5, null, { auth: { email: 'user100@name.com,', password: 'P4ssword' } });
    expect(response.status).toBe(403);
  });

  it('updates username in database when valid update request is sent from authorized user', async () => {
    const savedUser = await addUser();
    const validUpdate = { username: 'user1-updated' };
    await updateUser(savedUser.id, validUpdate, {
      auth: { email: savedUser.email, password: 'P4ssword' },
    });

    const inDBUser = await User.findOne({ where: { id: savedUser.id } });
    expect(inDBUser.username).toBe(validUpdate.username);
  });

  it('returns 403 when token is not valid', async () => {
    const response = await updateUser(5, null, { token: '123' });
    expect(response.status).toBe(403);
  });
});
