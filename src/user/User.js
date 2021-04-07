const Sequalize = require('sequelize');
const sequalize = require('../config/database');
const Token = require('../auth/Token');

const Model = Sequalize.Model;

class User extends Model {}

User.init(
  {
    username: {
      type: Sequalize.STRING,
    },
    email: {
      type: Sequalize.STRING,
    },
    password: {
      type: Sequalize.STRING,
    },
    inactive: {
      type: Sequalize.BOOLEAN,
      defaultValue: true,
    },
    activationToken: {
      type: Sequalize.STRING,
    },
  },
  {
    sequelize: sequalize,
    modelName: 'Users',
  }
);

User.hasMany(Token, { onDelete: 'cascade', foreignKey: 'userId' });

module.exports = User;
