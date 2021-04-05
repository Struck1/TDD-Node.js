const express = require('express');
const { findByEmail } = require('../user/UserService');
const AuthException = require('./AuthException');
const router = express.Router();
const bcrypt = require('bcrypt');
const ForbiddenException = require('../error/ForbiddenException');
const { validationResult, check } = require('express-validator');
const TokenService = require('./TokenService');

router.post('/api/1.0/auth', check('email').isEmail(), async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AuthException());
  }
  const { email, password } = req.body;
  const user = await findByEmail(email);

  if (!user) {
    return next(new AuthException());
  }
  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return next(new AuthException());
  }
  if (user.inactive) {
    return next(new ForbiddenException());
  }

  const token = TokenService.createToken(user);

  res.send({
    id: user.id,
    username: user.username,
    token,
  });
});

module.exports = router;
