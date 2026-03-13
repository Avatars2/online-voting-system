import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
      next();
    } catch (error) {
      return res.status(401).json({ error: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ error: 'Not authorized, no token' });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: `Not authorized. Required role: ${roles.join(', ')}` 
      });
    }
    next();
  };
};

export const departmentAccess = async (req, res, next) => {
  try {
    // For HODs, check if they have access to the requested department
    if (req.user.role === 'hod') {
      const requestedDeptId = req.params.departmentId || req.body.departmentId || req.body.department;
      if (requestedDeptId && requestedDeptId !== req.user.assignedDepartment.toString()) {
        return res.status(403).json({ error: 'Access denied. You can only access your assigned department.' });
      }
    }
    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const classAccess = async (req, res, next) => {
  try {
    // For Teachers, check if they have access to the requested class
    if (req.user.role === 'teacher') {
      const requestedClassId = req.params.classId || req.params.id || req.body.classId || req.body.class || req.query.class;
      if (requestedClassId && requestedClassId !== req.user.assignedClass.toString()) {
        return res.status(403).json({ error: 'Access denied. You can only access your assigned class.' });
      }
    }
    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
