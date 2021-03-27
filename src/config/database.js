const Sequalize = require('sequelize');

const sequalize = new Sequalize('hoaxify', 'my-db-user', 'db-pass', {
  dialect: 'sqlite',
  storage: './database.sqlite',
  logging: false,
});

module.exports = sequalize;
