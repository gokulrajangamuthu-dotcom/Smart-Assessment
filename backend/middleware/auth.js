import jwt from 'jsonwebtoken';

// Verifies JWT token and attaches decoded user info to req.user
export function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer '))   {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, role: 'student' | 'faculty', department_id }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Restricts route to faculty only
export function facultyOnly(req, res, next) {
  if (req.user.role !== 'faculty') {
    return res.status(403).json({ error: 'Faculty access only' });
  }
  next();
}

// Restricts route to students only
export function studentOnly(req, res, next) {
  if (req.user.role !== 'student') {
    return res.status(403).json({ error: 'Student access only' });
  }
  next();
}

// Restricts route to admin faculty only
export function adminOnly(req, res, next) {
  if (req.user.role !== 'faculty' || !req.user.is_admin) {
    return res.status(403).json({ error: 'Admin access only' });
  }
  next();
}
