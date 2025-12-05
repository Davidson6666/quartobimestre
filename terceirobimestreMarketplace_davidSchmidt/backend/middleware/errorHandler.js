function globalErrorHandler(err, req, res, next) {
  console.error('Global error handler:', err.stack || err); // <--- log completo
  const status = err.status || 500;
  res.status(status).json({ success: false, message: err.message || 'Erro interno' });
}

module.exports = globalErrorHandler;