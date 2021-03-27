const Sequalize = require('sequelize');
const sequalize = require('../config/database');

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
  },
  {
    sequelize: sequalize,
    modelName: 'Users',
  }
);

module.exports = User;
