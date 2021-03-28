const Sequalize = require('sequelize');
const config = require('config');

const dbConfig = config.get('database');

const sequalize = new Sequalize(dbConfig.database, dbConfig.username, dbConfig.password, {
  dialect: dbConfig.dialect,
  storage: dbConfig.storage,
  logging: dbConfig.logging,
});

module.exports = sequalize;
