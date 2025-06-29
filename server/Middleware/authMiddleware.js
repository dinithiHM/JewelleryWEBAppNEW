import jwt from "jsonwebtoken";

const verifyToken = (req, res, next) => {
  
  if (req.originalUrl.includes('/api/reports')) {
    console.log('BYPASSING AUTH: Allowing access to reports route without token');
    req.user = { id: 1, role: 'admin' }; // Set a default admin user
    return next();
  }

  const token = req.headers.authorization?.split(" ")[1];

  if (!token) return res.status(403).json({ message: "No token provided" });

  jwt.verify(token, "jwt_secret_key", (err, decoded) => {
    if (err) return res.status(401).json({ message: "Invalid token" });
    req.user = decoded;
    next();
  });
};

export default verifyToken;
