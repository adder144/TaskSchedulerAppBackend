// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const {
    UserRegistration,
    UserLogin,
    UserLogout
} = require('../Controllers/auth');
const { UserMiddleware } = require('../Middleware/Middleware');

// Routes for authentication
router
  .route('/')
  .put(UserRegistration)
  .post(UserLogin)
  .get(UserMiddleware, UserLogout);

module.exports = router;
