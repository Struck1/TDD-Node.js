const pagination = (req, res, next) => {
  let pageNumber = Number.parseInt(req.query.page);
  let sizeNumber = Number.parseInt(req.query.size);
  let page = Number.isNaN(pageNumber) ? 0 : pageNumber;
  if (page < 0) {
    page = 0;
  }
  let size = Number.isNaN(sizeNumber) ? 10 : sizeNumber;
  if (size > 10 || size < 0) {
    size = 10;
  }

  req.pagination = { page, size };
  next();
};

module.exports = pagination;
