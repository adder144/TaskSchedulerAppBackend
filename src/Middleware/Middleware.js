const jwt = require('jsonwebtoken');
const JWT_SECRET = 'taskSchedulerAppSecretKey';
const LoggedIn = require('../Models/LoggedIn');

const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) {
        return res.status(403).json({ message: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // Attach user info to request object
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid token' });
    }
};

const SupervisorMiddleware = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(403).json({ message: 'Invalid JWT Token' });
        }
        
        const decoded = jwt.verify(token, JWT_SECRET);
        const { userId, userName, userRole } = decoded;

        if (userRole !== 'Supervisor') {
            return res.status(403).json({ message: 'Wrong UserType' });
        }

        const isLoggedIn = await LoggedIn.findOne({ userId: userId });
        if (!isLoggedIn) {
            return res.status(403).json({ message: 'Unauthorized User' });
        }

        req.body.params = { UserID: userId, UserName: userName, UserRole: userRole };
        next();
    } catch (error) {
        return res.status(403).json({ message: 'Invalid JWT Token' });
    }
};

const UserMiddleware = async (req, res, next) => {
  try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
          return res.status(403).json({ message: 'Missing JWT Token' });
      }
      console.log(token);
      
      const decoded = jwt.verify(token, JWT_SECRET);
      const { userId, userName, userRole } = decoded;

      const isLoggedIn = await LoggedIn.findOne({ userId: userId });
      if (!isLoggedIn) {

        console.log("Not Logged In");
        return res.status(403).json({ message: 'Unauthorized User' });
      }

      req.body.params = { UserID: userId, UserName: userName, UserRole: userRole };
      next();
  } catch (error) {
        console.log("Error: " + error);
      return res.status(403).json({ message: 'Invalid JWT Token' });
  }
};

module.exports = {
    verifyToken,
    SupervisorMiddleware,
    UserMiddleware
}

