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

const auth = async (options = {}) => {
  let token;
  if (options.auth) {
    const response = await request(app).post('/api/1.0/auth').send(options.auth);
    token = response.body.token;
  }
  return token;
};

const getUsers = (options = {}) => {
  const agent = request(app).get('/api/1.0/users');
  if (options.token) {
    agent.set('Authorization', `Bearer ${options.token}`);
  }
  return agent;
};

const createUser = async (activeUser, inactiveUser = 0) => {
  const hash = await bcrypt.hash('P4ssword', 10);
  for (let i = 0; i < activeUser + inactiveUser; i++) {
    await User.create({
      username: `user${i + 1}`,
      email: `user${i + 1}@mail.com`,
      inactive: i >= activeUser,
      password: hash,
    });
  }
};

describe('Listening users', () => {
  it('return 200 OK', async () => {
    const response = await getUsers();
    expect(response.status).toBe(200);
  });

  it('returns page object as res body', async () => {
    const response = await getUsers();
    const body = response.body;
    expect(body).toEqual({
      content: [],
      page: 0,
      size: 10,
      totalPages: 0,
    });
  });

  it('return 10 users in page when there are 11 users in db', async () => {
    await createUser(11);
    const users = await getUsers();
    expect(users.body.content.length).toEqual(10);
  });

  it('return 6 users in page when 6 active and 5 inactive users', async () => {
    await createUser(6, 5);
    const users = await getUsers();
    expect(users.body.content.length).toEqual(6);
  });

  it('returns only id, username and mail in content', async () => {
    await createUser(6, 5);
    const users = await getUsers();
    const user = users.body.content[0];
    expect(Object.keys(user)).toEqual(['id', 'username', 'email']);
  });

  it('returns 2 total page where there are  15 active 7 inactive user', async () => {
    await createUser(15, 7);
    const users = await getUsers();
    const user = users.body;
    expect(user.totalPages).toBe(2);
  });

  it('first page is zero', async () => {
    await createUser(11);
    const users = await getUsers().query({ page: -5 });
    expect(users.body.page).toBe(0);
  });

  it('return 5 users, size is set 5 request parameter', async () => {
    await createUser(11);
    const users = await getUsers().query({ size: 5 });
    expect(users.body.content.length).toBe(5);
    expect(users.body.size).toBe(5);
  });

  it('returns 10 users, if size parameter > 10', async () => {
    await createUser(11);
    const users = await getUsers().query({ size: 10000 });
    expect(users.body.content.length).toBe(10);
    expect(users.body.size).toBe(10);
  });

  it('return page 0 and size 10, if page and size string value', async () => {
    await createUser(11);
    const users = await getUsers().query({ size: 'size', page: 'page' });
    expect(users.body.page).toBe(0);
    expect(users.body.size).toBe(10);
  });
});

describe('Get users', () => {
  const getUser = (id = 2) => {
    return request(app).get(`/api/1.0/users'${id}`);
  };

  it('returns 404 when user not found ', async () => {
    const response = await getUser();
    expect(response.status).toBe(404);
  });

  it('return user not found error ', async () => {
    const response = await request(app).get('/api/1.0/users/2');
    expect(response.body.message).toBe('User not found');
  });

  it('returns 200 when an active user exist', async () => {
    const user = await User.create({
      username: 'user1',
      email: 'emre@mail.com',
      inactive: false,
    });

    const response = await request(app).get(`/api/1.0/users/${user.id}`);
    expect(response.status).toBe(200);
  });

  it('returns 404 when the user is inactive', async () => {
    const user = await User.create({
      username: 'user1',
      email: 'emre@mail.com',
      inactive: true,
    });

    const response = await request(app).get(`/api/1.0/users/${user.id}`);
    expect(response.status).toBe(404);
  });

  it('user when request has valid authorization', async () => {
    await createUser(11);
    const token = await auth({ auth: { email: 'user1@mail.com', password: 'P4ssword' } });
    const response = await getUsers({ token: token });
    expect(response.body.totalPages).toBe(1);
  });
});
