const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/User');
const sequalize = require('../src/config/database');
const bcrypt = require('bcrypt');
const Token = require('../src/auth/Token');

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

const postAuthentication = async (credentials) => {
  return await request(app).post('/api/1.0/auth').send(credentials);
};

const logout = (options = {}) => {
  const agent = request(app).post('/api/1.0/logout');
  if (options.token) {
    agent.set('Authorization', `Bearer ${options.token}`);
  }
  return agent.send();
};

describe('User auth', () => {
  it('returns 200 when credentials are correct', async () => {
    await addUser();
    const response = await postAuthentication({ email: 'user1@mail.com', password: 'P4ssword' });
    expect(response.status).toBe(200);
  });

  it('return only user id, token and username when login succces', async () => {
    const user = await addUser();
    const response = await postAuthentication({ email: 'user1@mail.com', password: 'P4ssword' });
    expect(response.body.id).toBe(user.id);
    expect(response.body.username).toBe(user.username);
    expect(Object.keys(response.body)).toEqual(['id', 'username', 'token']);
  });

  it('returns 401 when user does not exist', async () => {
    const response = await postAuthentication({ email: 'user1@mail.com', password: 'P4ssword' });
    expect(response.status).toBe(401);
  });

  it('returns 401 when user password is wrong', async () => {
    await addUser();
    const response = await postAuthentication({ email: 'user1@mail.com', password: 'P4sswordd' });
    expect(response.status).toBe(401);
  });

  it('returns 403 when loggin in with an inactive account', async () => {
    await addUser({ ...userdata, inactive: true });
    const response = await postAuthentication({ email: 'user1@mail.com', password: 'P4ssword' });
    expect(response.status).toBe(403);
  });

  it('returns 401 when email is not valid', async () => {
    const response = await postAuthentication({ password: 'P4ssword' });
    expect(response.status).toBe(401);
  });

  it('retuns token in response body', async () => {
    await addUser();
    const response = await postAuthentication({ email: 'user1@mail.com', password: 'P4ssword' });
    expect(response.body.token).not.toBeUndefined();
  });
});

describe('Logout', () => {
  it('returns 200 ok logout', async () => {
    const response = await logout();
    expect(response.status).toBe(200);
  });

  it('removes the token from databese', async () => {
    await addUser();
    const response = await postAuthentication({ email: 'user1@mail.com', password: 'P4ssword' });
    const token = response.body.token;
    await logout({ token: token });
    const storedToken = await Token.findOne({ where: { token: token } });
    expect(storedToken).toBeNull();
  });
});

describe('token expiration', () => {
  const updateUser = async (id = 5, body = null, options = {}) => {
    let agent = request(app);

    agent = request(app).put('/api/1.0/users/' + id);
    if (options.token) {
      agent.set('Authorization', `Bearer ${options.token}`);
    }
    return agent.send(body);
  };

  it('returns 403 when token older than 1 week', async () => {
    const savedUser = await addUser();
    const token = 'test';
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 - 1);
    await Token.create({
      token: token,
      userId: savedUser.id,
      lastUsedAt: oneWeekAgo,
    });
    const validUpdate = { username: 'user1Update' };
    const response = await updateUser(savedUser.id, validUpdate, { token: token });
    expect(response.status).toBe(403);
  });

  it('refreshes lastUserAt when unexpired token is used ', async () => {
    const savedUser = await addUser();
    const token = 'test';
    const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
    await Token.create({
      token: token,
      userId: savedUser.id,
      lastUsedAt: fourDaysAgo,
    });
    const validUpdate = { username: 'user1Update' };
    const rightBeforeSendingRequest = new Date();
    await updateUser(savedUser.id, validUpdate, { token: token });
    const tokenInDB = await Token.findOne({ where: { token: token } });
    expect(tokenInDB.lastUsedAt.getTime()).toBeGreaterThan(rightBeforeSendingRequest.getTime());
  });

  it('refreshes lastUserAt when unexpired token is used  for unauthendicated', async () => {
    const savedUser = await addUser();
    const token = 'test';
    const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
    await Token.create({
      token: token,
      userId: savedUser.id,
      lastUsedAt: fourDaysAgo,
    });

    const rightBeforeSendingRequest = new Date();
    await request(app).get('/api/1.0/users/5').set('Authorization', `Bearer ${token}`);
    const tokenInDB = await Token.findOne({ where: { token: token } });
    expect(tokenInDB.lastUsedAt.getTime()).toBeGreaterThan(rightBeforeSendingRequest.getTime());
  });
});
