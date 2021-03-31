const express = require('express');
const app = express();
const userRouter = require('./user/UserRouter');
const errorHandler = require('../src/error/ErrorHandler');
app.use(express.json());

app.use(userRouter);

app.use(errorHandler);
module.exports = app;
