const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/User');
const sequalize = require('../src/config/database');
const SMTPServer = require('smtp-server').SMTPServer;

let lastEmail, server;
let simulateSmtpFailute = false;

beforeAll(async () => {
  server = new SMTPServer({
    authOptional: true,
    onData(stream, session, callback) {
      let mailBody;
      stream.on('data', (data) => {
        mailBody += data.toString();
      });
      stream.on('end', () => {
        if (simulateSmtpFailute) {
          const err = new Error('Invalid mailbox');
          err.responseCode = 533;
          return callback(err);
        }
        lastEmail = mailBody;
        callback();
      });
    },
  });
  await server.listen(8587, 'localhost');

  await sequalize.sync();
});

beforeEach(() => {
  simulateSmtpFailute = false;
  return User.destroy({ truncate: true });
});

afterAll(async () => {
  await server.close();
});

const validUser = {
  username: 'user',
  email: 'user@user.com',
  password: 'P4word',
};

const postUser = (user = validUser) => {
  return request(app).post('/api/1.0/users').send(user);
};

describe('User Registration', () => {
  it('returns 200 OK when signup request is valid', async () => {
    const response = await postUser();
    expect(response.status).toBe(200);
  });

  it('returns success message when signup request is valid', async () => {
    const response = await postUser();
    expect(response.body.message).toBe('User created');
  });

  it('saves the users to database', async () => {
    await postUser();
    const userList = await User.findAll();
    expect(userList.length).toBe(1);
  });

  it('saves the users and email to database', async () => {
    await postUser();
    const userList = await User.findAll();
    const savedUser = userList[0];
    expect(savedUser.username).toBe('user');
    expect(savedUser.email).toBe('user@user.com');
  });

  it('hashes the password in database', async () => {
    await postUser();
    //query user table
    const userList = await User.findAll();
    const savedUser = userList[0];
    expect(savedUser.password).not.toBe('P4word');
  });

  it('return 400 when username is null', async () => {
    const response = await postUser({
      username: null,
      email: 'user@user.com',
      password: 'P4ssword',
    });
    expect(response.status).toBe(400);
  });

  it('return validationErrors field in response body', async () => {
    const response = await postUser({
      username: null,
      email: 'user@user.com',
      password: 'P4ssword',
    });
    const body = response.body;
    expect(body.validationErrors).not.toBeUndefined();
  });

  it('return errors username and email is null', async () => {
    const response = await postUser({
      username: null,
      email: null,
      password: 'P4ssword',
    });
    const body = response.body;
    expect(Object.keys(body.validationErrors)).toEqual(['username', 'email']);
  });

  it.each`
    field         | value              | expectedMessage
    ${'username'} | ${null}            | ${'Username cannot be null'}
    ${'username'} | ${'usr'}           | ${'Must have min 4 and max 32 characters'}
    ${'username'} | ${'a'.repeat(33)}  | ${'Must have min 4 and max 32 characters'}
    ${'email'}    | ${null}            | ${'Email cannot be null'}
    ${'email'}    | ${'mail.com'}      | ${'Email is not valid'}
    ${'email'}    | ${'user.mail.com'} | ${'Email is not valid'}
    ${'email'}    | ${'user@mail'}     | ${'Email is not valid'}
    ${'password'} | ${null}            | ${'Password cannot be null'}
    ${'password'} | ${'P4ssw'}         | ${'Password must be at least 6 characters'}
    ${'password'} | ${'alllowercase'}  | ${'Password must be have at least 1 uppercase, 1 lovercase and 1 number'}
    ${'password'} | ${'UPPPERCASE'}    | ${'Password must be have at least 1 uppercase, 1 lovercase and 1 number'}
    ${'password'} | ${'UPPERlover'}    | ${'Password must be have at least 1 uppercase, 1 lovercase and 1 number'}
    ${'password'} | ${'UPPER123456'}   | ${'Password must be have at least 1 uppercase, 1 lovercase and 1 number'}
    ${'password'} | ${'lover123456'}   | ${'Password must be have at least 1 uppercase, 1 lovercase and 1 number'}
    ${'password'} | ${'1234567'}       | ${'Password must be have at least 1 uppercase, 1 lovercase and 1 number'}
  `('returns $expectedMessage when $field is $value', async ({ field, expectedMessage, value }) => {
    const user = {
      username: 'user1',
      email: 'emre@emre.com',
      password: 'P4ssword',
    };
    user[field] = value;
    const response = await postUser(user);
    const body = response.body;
    expect(body.validationErrors[field]).toBe(expectedMessage);
  });

  it('return validation error when email in use', async () => {
    await User.create({ ...validUser });
    const response = await postUser();
    const body = response.body;
    expect(body.validationErrors.email).toBe('Email in use');
  });

  it('return validation error username is null and email is in use', async () => {
    await User.create({ ...validUser });
    const response = await postUser({
      username: null,
      email: 'user@user.com',
      password: 'P4ssword',
    });
    const body = response.body;
    expect(Object.keys(body.validationErrors)).toEqual(['username', 'email']);
  });

  it('return validation error failure message ', async () => {
    const response = await postUser({
      username: null,
      email: 'user@user.com',
      password: 'P4ssword',
    });

    const body = response.body;
    expect(body.message).toEqual('Validation failure');
  });

  it('create user in inactive mode', async () => {
    await postUser();
    const users = await User.findAll();
    const savedUser = users[0];
    expect(savedUser.inactive).toBe(true);
  });

  it('create user in inactive mode request body contains inactive false', async () => {
    const newUser = { ...validUser, inactive: false };
    await postUser(newUser);
    const users = await User.findAll();
    const savedUser = users[0];
    expect(savedUser.inactive).toBe(true);
  });

  it('create an activationToken for user', async () => {
    await postUser();
    const users = await User.findAll();
    const savedUser = users[0];
    expect(savedUser.activationToken).toBeTruthy();
    //null, undefiend, "", 0, false => falsy
  });

  it('send activation email with activationToken', async () => {
    await postUser();
    const users = await User.findAll();
    const savedUser = users[0];
    expect(lastEmail).toContain('user@user.com');
    expect(lastEmail).toContain(savedUser.activationToken);
  });

  it('returns 502 when sending email fails', async () => {
    simulateSmtpFailute = true;
    const response = await postUser();
    expect(response.status).toBe(502);
  });

  it('returns Email fail message when sending email fail', async () => {
    simulateSmtpFailute = true;
    const response = await postUser();
    expect(response.body.message).toBe('Email fail');
  });

  it('not save user to database if activation email fails', async () => {
    simulateSmtpFailute = true;
    await postUser();
    const users = await User.findAll();
    expect(users.length).toBe(0);
  });

  it('activates the account when correct token is send ', async () => {
    await postUser();
    let users = await User.findAll();
    const token = users[0].activationToken;

    await request(app)
      .post('/api/1.0/users/token/' + token)
      .send();

    users = await User.findAll();
    expect(users[0].inactive).toBe(false);
  });

  it('removes the token ', async () => {
    await postUser();
    let users = await User.findAll();
    const token = users[0].activationToken;

    await request(app)
      .post('/api/1.0/users/token/' + token)
      .send();

    users = await User.findAll();
    expect(users[0].activationToken).toBeFalsy();
  });

  it('invalid token', async () => {
    await postUser();
    const token = 'Invalid token';

    await request(app)
      .post('/api/1.0/users/token/' + token)
      .send();

    const users = await User.findAll();
    expect(users[0].inactive).toBe(true);
  });

  it('return bad request when token is wrong', async () => {
    await postUser();
    const token = 'Invalid token';
    const response = await request(app)
      .post('/api/1.0/users/token/' + token)
      .send();

    expect(response.status).toBe(400);
  });

  describe('Error model', () => {
    it('returns path, timestamp, message and validation errors', async () => {
      const response = await postUser({ ...validUser, username: null });
      const body = response.body;
      expect(Object.keys(body)).toEqual(['path', 'timestamp', 'message', 'validationErrors']);
    });

    it('returns path, timestamp and message when request fail', async () => {
      const token = 'Invalid-token';
      const response = await request(app)
        .post('/api/1.0/users/token/' + token)
        .send();

      const body = response.body;
      expect(Object.keys(body)).toEqual(['path', 'timestamp', 'message']);
    });

    it('returns path in the error body', async () => {
      const token = 'Invalid-token';
      const response = await request(app)
        .post('/api/1.0/users/token/' + token)
        .send();
      const body = response.body;
      expect(body.path).toEqual(`/api/1.0/users/token/${token}`);
    });

    it('returns timestamp in miliseconds', async () => {
      const nowInMillis = new Date().getTime();
      const fiveSecondsLater = nowInMillis + 5 * 1000;
      const token = 'Invalid-token';
      const response = await request(app)
        .post('/api/1.0/users/token/' + token)
        .send();
      const body = response.body;
      expect(body.timestamp).toBeGreaterThan(nowInMillis);
      expect(body.timestamp).toBeLessThan(fiveSecondsLater);
    });
  });

  /*
  it('return validation error when username less than 4 characters', async () => {
    const response = await postUser({
      username: 'usr',
      email: 'emre@emre.com',
      password: 'P4ssword',
    });
    const body = response.body;
    expect(body.validationErrors.username).toBe('Must min 4 and max 32 characters');
  });
  */

  /*
  it.each([
    ['username', 'Username cannot be null'],
    ['password', 'Password cannot be null'],
    ['email', 'Email cannot be null'],
  ])('when %s is null %s is received', async (field, expectedMessage) => {
    const user = {
      username: 'user1',
      email: 'emre@emre.com',
      password: 'P4ssword',
    };
    user[field] = null;
    const response = await postUser(user);
    const body = response.body;
    expect(body.validationErrors[field]).toBe(expectedMessage);
  });
  */

  /*
  it('return errors password is null', async () => {
    const response = await postUser({
      username: 'user1',
      email: 'emre@emre.com',
      password: null,
    });
    const body = response.body;
    expect(body.validationErrors.password).toBe('Password cannot be null');
  });

  it('return username cannot be null when username is null', async () => {
    const response = await postUser({
      username: null,
      email: 'user@user.com',
      password: 'P4ssword',
    });
    const body = response.body;
    expect(body.validationErrors.username).toBe('Username cannot be null');
  });

  it('return email cannot be null when email is null', async () => {
    const response = await postUser({
      username: 'user',
      email: null,
      password: 'P4ssword',
    });
    const body = response.body;
    expect(body.validationErrors.email).toBe('Email cannot be null');
  });
  */
});
