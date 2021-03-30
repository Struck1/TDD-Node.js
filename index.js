const app = require('./src/app');
const sequalize = require('./src/config/database');

sequalize.sync({ force: true });

app.listen(3000, () => console.log('app is runnig'));
