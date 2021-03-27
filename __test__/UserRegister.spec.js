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
  it('returns 200 OK when signup request is valid', (done) => {
    request(app)
      .post('/api/1.0/users')
      .send({
        username: 'user',
        email: 'user@user.com',
        password: 'P4word',
      })
      .then((response) => {
        expect(response.status).toBe(200);
        done();
      });
  });

  it('returns success message when signup request is valid', (done) => {
    request(app)
      .post('/api/1.0/users')
      .send({
        username: 'user',
        email: 'user@user.com',
        password: 'P4word',
      })
      .then((response) => {
        expect(response.body.message).toBe('User created');
        done();
      });
  });

  it('saves the users to database', (done) => {
    request(app)
      .post('/api/1.0/users')
      .send({
        username: 'user',
        email: 'user@user.com',
        password: 'P4word',
      })
      .then(() => {
        //query user table
        User.findAll().then((userList) => {
          expect(userList.length).toBe(1);
          done();
        });
      });
  });

  it('saves the users and email to database', (done) => {
    request(app)
      .post('/api/1.0/users')
      .send({
        username: 'user',
        email: 'user@user.com',
        password: 'P4word',
      })
      .then(() => {
        //query user table
        User.findAll().then((userList) => {
          const savedUser = userList[0];
          expect(savedUser.username).toBe('user');
          expect(savedUser.email).toBe('user@user.com');
          done();
        });
      });
  });

  it('hashes the password in database', (done) => {
    request(app)
      .post('/api/1.0/users')
      .send({
        username: 'user',
        email: 'user@user.com',
        password: 'P4word',
      })
      .then(() => {
        //query user table
        User.findAll().then((userList) => {
          const savedUser = userList[0];
          expect(savedUser.password).not.toBe('P4word');
          done();
        });
      });
  });
});
