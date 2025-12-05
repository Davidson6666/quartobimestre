module.exports = function catchAsync(fn) {
  return function (req, res, next) {
    // Return the Promise so callers/tests can await it
    return Promise.resolve(fn(req, res, next)).catch(next);
  };
};
