import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      req.user = await User.findById(decoded.id).select('-passwordHash');
      next();
    } catch (error) {
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }
  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

export const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'Admin') {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as an Admin' });
  }
};

export const isEditor = (req, res, next) => {
  if (req.user && req.user.role === 'Editor') {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as an Editor' });
  }
};

export const isReviewer = (req, res, next) => {
  if (req.user && req.user.role === 'Reviewer') {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as a Reviewer' });
  }
};

export const isAuthor = (req, res, next) => {
  if (req.user && req.user.role === 'Author') {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as an Author' });
  }
};

export const isProductionEditor = (req, res, next) => {
  if (req.user && req.user.role === 'Production Editor') {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as a Production Editor' });
  }
};
