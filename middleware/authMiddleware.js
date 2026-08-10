const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "ekotro-dev-secret";

// ========================================
// Authentication Middleware
// Verifies JWT and attaches decoded user
// information to req.user
// ========================================
const protect = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // Check Authorization header
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Extract token
    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Verify token
    const decoded = jwt.verify(
      token,
      JWT_SECRET
    );

    // Attach decoded user data to request
    req.user = decoded;

    next();
  } catch (error) {
    // JWT expired
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token has expired. Please login again.",
      });
    }

    // Invalid JWT
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    // Other authentication errors
    return res.status(401).json({
      success: false,
      message: "Authentication failed",
    });
  }
};


// ========================================
// Authorization Middleware
// Checks whether authenticated user's role
// is allowed to access the route
// ========================================
const authorize = (...roles) => {
  return (req, res, next) => {
    // User must first pass protect middleware
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Make sure JWT contains role
    if (!req.user.role) {
      return res.status(403).json({
        success: false,
        message: "User role not found",
      });
    }

    // Check permitted roles
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(
          " or "
        )}`,
      });
    }

    next();
  };
};


// ========================================
// Export Middleware
// ========================================
module.exports = {
  protect,
  authorize,
};