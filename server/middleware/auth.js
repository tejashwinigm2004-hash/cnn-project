const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  // Website sends the token via httpOnly cookie; mobile sends it via Authorization header
  const tokenFromCookie = req.cookies?.token;
  const tokenFromHeader = req.header('Authorization')?.replace('Bearer ', '');
  const token = tokenFromCookie || tokenFromHeader;

  if (!token) return res.status(401).json({ message: 'No token, access denied' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
};