const express = require('express');
const router = express.Router();
const userService = require('./UserService');

router.post('/api/1.0/users', async (req, res) => {
  await userService.save(req.body);
  return res.send({ message: 'User created' });
});

module.exports = router;
