import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const AuthMiddleware  =async(req, res, next) => {
 const token1 = req.header("Authorization")?.replace("Bearer ", "").trim();
  if (!token1) {
    return res.status(401).json({ message: "Unauthorized: No token provided" });
  }
  try {
    const decoded = jwt.verify(token1, process.env.SECRET);
    req.user = await User.findById(decoded._id);
    if (!req.user) {
      return res.status(403).json({ message: "Invalid token: No user found" });
    }
    if (req.user.blocked) {
      return res.status(403).json({ message: "Your account is blocked. Contact the admin." });
    }
    next();
  } 
  catch (error) {
    return res.status(403).json({ message: "Invalid or expired token" });
  }
};

export default AuthMiddleware;

export const isSuperAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'superadmin') {
    return res.status(403).json({ message: 'Access denied. Only Super Admin can perform this action.' });
  }
  next();
};
export const isAdmin = (req, res, next) => {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'superadmin')) {
    return res.status(403).json({ message: 'Access denied. Admins only.' });
  }
  next();
};
  
