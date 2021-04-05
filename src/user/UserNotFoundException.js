module.exports = function UserNotException() {
  this.status = 404;
  this.message = 'User not found';
};
