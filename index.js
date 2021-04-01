const app = require('./src/app');
const sequalize = require('./src/config/database');
const User = require('./src/user/User');

const createUser = async (activeUser, inactiveUser = 0) => {
  for (let i = 0; i < activeUser + inactiveUser; i++) {
    await User.create({
      username: `user${i + 1}`,
      email: `user${i + 1}@mail.com`,
      inactive: i >= activeUser,
    });
  }
};

sequalize.sync({ force: true }).then(async () => {
  await createUser(25);
});

app.listen(3000, () => console.log('app is runnig'));
