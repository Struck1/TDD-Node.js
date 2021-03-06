const bcrypt = require('bcrypt');
const User = require('./User');
const randomString = require('../shared/generator');
const emailService = require('../email/emailServis');
const sequelize = require('../config/database');
const EmailException = require('../email/EmailException');
const InvalidTokenException = require('../user/InvalidErrorException');
const UserNotFoundException = require('./UserNotFoundException');
const Sequelize = require('sequelize');

const save = async (body) => {
  const { username, email, password } = body;
  const hash = await bcrypt.hash(password, 10);
  const user = { username, email, password: hash, activationToken: randomString(16) };
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

const getUsers = async (page, size, authenticatedUser) => {
  const users = await User.findAndCountAll({
    where: {
      inactive: false,
      id: { [Sequelize.Op.not]: authenticatedUser ? authenticatedUser.id : 0 },
    },
    attributes: ['id', 'username', 'email'],
    limit: size,
    offset: page * size,
  });
  return {
    content: users.rows,
    page: page,
    size: size,
    totalPages: Math.ceil(users.count / size),
  };
};

const getUserById = async (id) => {
  const user = await User.findOne({
    where: { id: id, inactive: false },
    attributes: ['id', 'username', 'email'],
  });

  if (!user) {
    throw new UserNotFoundException();
  }

  return user;
};

const updateUser = async (id, updatedBody) => {
  const user = await User.findOne({ where: { id: id } });

  user.username = updatedBody.username;

  await user.save();
  return {
    id: id,
    username: user.username,
    email: user.email,
  };
};

const deleteUser = async (id) => {
  await User.destroy({ where: { id: id } });
};

module.exports = { save, findByEmail, activate, getUsers, getUserById, updateUser, deleteUser };
