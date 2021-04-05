const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/User');
const sequalize = require('../src/config/database');
const bcrypt = require('bcrypt');

beforeAll(async () => {
  await sequalize.sync();
});

beforeEach(() => {
  return User.destroy({ truncate: true });
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
