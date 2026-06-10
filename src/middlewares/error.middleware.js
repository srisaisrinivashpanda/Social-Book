const errorHandler = (err, req, res, next) => {
  return res.status(err.statusCode || 500).json({
    statusCode: err.statusCode || 500,
    message: err.message || "Internal Server Error",
    data: err.data || null,
    errors: err.errors || [],
  });
};

export default errorHandler;
