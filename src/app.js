const express = require('express');
const app = express();
const userRouter = require('./user/UserRouter');
app.use(express.json());

app.use(userRouter);

module.exports = app;
