const bcrypt = require('bcrypt');
const User = require('./User');
const crypto = require('crypto');
const emailService = require('../email/emailServis');
const sequelize = require('../config/database');
const EmailException = require('../email/EmailException');
const InvalidTokenException = require('../user/InvalidErrorException');

const generateToken = (length) => {
  return crypto.randomBytes(length).toString('hex').substring(0, length);
};

const save = async (body) => {
  const { username, email, password } = body;
  const hash = await bcrypt.hash(password, 10);
  const user = { username, email, password: hash, activationToken: generateToken(16) };
  console.log(user.activationToken);
  const transaction = await sequelize.transaction();
  await User.create(user, { transaction });
  try {
    await emailService.sendEmail(email, user.activationToken);
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw new EmailException();
  }
};

const findByEmail = async (email) => {
  return await User.findOne({ where: { email: email } });
};

const activate = async (token) => {
  const user = await User.findOne({ where: { activationToken: token } });
  if (!user) {
    throw new InvalidTokenException();
  }
  user.inactive = false;
  user.activationToken = null;
  await user.save();
};

module.exports = { save, findByEmail, activate };
