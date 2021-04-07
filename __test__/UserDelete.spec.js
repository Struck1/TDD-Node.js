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

const credentials = { email: 'user1@mail.com', password: 'P4ssword' };

const addUser = async (user = { ...userdata }) => {
  const hash = await bcrypt.hash(user.password, 10);
  user.password = hash;
  return await User.create(user);
};

const auth = async (options = {}) => {
  let token;
  if (options.auth) {
    const response = await request(app).post('/api/1.0/auth').send(options.auth);
    token = response.body.token;
  }
  return token;
};

const deleteUser = async (id = 5, options = {}) => {
  const agent = request(app).delete('/api/1.0/users/' + id);
  if (options.token) {
    agent.set('Authorization', `Bearer ${options.token}`);
  }
  return agent.send();
};

describe('User update', () => {
  it('returns forbidden', async () => {
    const response = await deleteUser();
    expect(response.status).toBe(403);
  });

  it('returns error body ', async () => {
    const response = await deleteUser(5);
    expect(response.body.path).toBe('/api/1.0/users/5');
    expect(response.body.message).toBe('unauthroized user delete');
  });

  it('returns 403 when token is not valid', async () => {
    const response = await deleteUser(5, { token: '123' });
    expect(response.status).toBe(403);
  });

  it('deletes user from database when request sent from authorized user', async () => {
    const savedUser = await addUser();
    const token = await auth({ auth: credentials });
    await deleteUser(savedUser.id, { token: token });

    const inDBUser = await User.findOne({ where: { id: savedUser.id } });
    expect(inDBUser).toBeNull();
  });

  it('deletes token from database', async () => {
    const savedUser = await addUser();
    const token = await auth({ auth: credentials });
    await deleteUser(savedUser.id, { token: token });

    const tokenInDB = await Token.findOne({ where: { token: token } });
    expect(tokenInDB).toBeNull();
  });

  it('deletes all token from database', async () => {
    const savedUser = await addUser();
    const token = await auth({ auth: credentials });
    const token1 = await auth({ auth: credentials });
    await deleteUser(savedUser.id, { token: token1 });

    const tokenInDB = await Token.findOne({ where: { token: token } });
    expect(tokenInDB).toBeNull();
  });
});
