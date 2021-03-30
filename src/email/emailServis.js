const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
  host: 'localhost',
  port: 8587,
  tls: {
    rejectUnauthorized: false,
  },
});

const sendEmail = async (email, token) => {
  await transporter.sendMail({
    from: 'My app <info@my-app.com',
    to: email,
    subject: 'Account activation',
    html: `Token is ${token}`,
  });
};

module.exports = { sendEmail };
