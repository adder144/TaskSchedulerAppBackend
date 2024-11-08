const express = require('express');
const router = express.Router();
const {
    GetNotifications, 
    GetUnreadNotifications, 
    MarkAllNotificationAsRead, 
    MarkNotificationAsRead, 
    GetNotificationPreference, 
    SetNotificationPreference
} = require('../Controllers/notification');

const { UserMiddleware } = require('../Middleware/Middleware');

router
  .route('/')
  .get(UserMiddleware, GetNotifications)
  .post(UserMiddleware, GetUnreadNotifications)


router
  .route('/MarkRead')
  .get(UserMiddleware, MarkAllNotificationAsRead)
  .post(UserMiddleware, MarkNotificationAsRead)

router
  .route('/Preference')
  .get(UserMiddleware, GetNotificationPreference)
  .post(UserMiddleware, SetNotificationPreference)

module.exports = router;
