module.exports = function ValidationError(errors) {
  this.errors = errors;
  this.status = 400;
  this.message = 'Validation failure';
};
