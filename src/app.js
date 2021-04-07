const express = require('express');
const userRouter = require('./user/UserRouter');
const errorHandler = require('../src/error/ErrorHandler');
const AuthenticationRouter = require('../src/auth/AuthRouter');
const tokenAuthentication = require('../src/middleware/tokenAuthentication');

const app = express();
app.use(express.json());

app.use(tokenAuthentication);
app.use(userRouter);
app.use(AuthenticationRouter);

app.use(errorHandler);
module.exports = app;
