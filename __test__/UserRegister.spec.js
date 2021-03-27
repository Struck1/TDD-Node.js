const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/User');
const sequalize = require('../src/config/database');

beforeAll(() => {
  return sequalize.sync();
});

beforeEach(() => {
  return User.destroy({ truncate: true });
});

describe('User Registration', () => {
  const validUserData = () => {
    return request(app).post('/api/1.0/users').send({
      username: 'user',
      email: 'user@user.com',
      password: 'P4word',
    });
  };

  it('returns 200 OK when signup request is valid', async () => {
    const response = await validUserData();
    expect(response.status).toBe(200);
  });

  it('returns success message when signup request is valid', async () => {
    const response = await validUserData();
    expect(response.body.message).toBe('User created');
  });

  it('saves the users to database', async () => {
    await validUserData();
    const userList = await User.findAll();
    expect(userList.length).toBe(1);
  });

  it('saves the users and email to database', async () => {
    await validUserData();
    const userList = await User.findAll();
    const savedUser = userList[0];
    expect(savedUser.username).toBe('user');
    expect(savedUser.email).toBe('user@user.com');
  });

  it('hashes the password in database', async () => {
    await validUserData();
    //query user table
    const userList = await User.findAll();
    const savedUser = userList[0];
    expect(savedUser.password).not.toBe('P4word');
  });
});
