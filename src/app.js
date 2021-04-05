const express = require('express');
const app = express();
const userRouter = require('./user/UserRouter');
const errorHandler = require('../src/error/ErrorHandler');
const AuthenticationRouter = require('../src/auth/AuthRouter');
app.use(express.json());

app.use(userRouter);
app.use(AuthenticationRouter);

app.use(errorHandler);
module.exports = app;
