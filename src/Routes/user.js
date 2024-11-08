const express = require('express');
const router = express.Router();
const {
    ViewAllSubordinates, 
    AddSubordinate, 
    ViewSubordinateList, 
    ViewSupervisorList, 
    RemoveSubordinate
} = require('../Controllers/users');

const { SupervisorMiddleware, UserMiddleware } = require('../Middleware/Middleware');

router
  .route('/')
  .get(SupervisorMiddleware, ViewAllSubordinates)
  .post(SupervisorMiddleware, AddSubordinate)
  .delete(SupervisorMiddleware, RemoveSubordinate);

router
  .route('/List')
  .get(SupervisorMiddleware, ViewSubordinateList)
  .post(UserMiddleware, ViewSupervisorList)


module.exports = router;
