const jwt = require('jsonwebtoken');

const createToken = (user) => {
  const token = jwt.sign({ id: user.id }, 'secret-key');
  return token;
};

const verify = (token) => {
  return jwt.verify(token, 'secret-key');
};
module.exports = { createToken, verify };
