const express = require('express');
const router = express.Router();
const {
    AddTask, 
    EditTask, 
    DeleteTask, 
    ViewTask, 
    ViewAllTask, 
    ViewOwnTask, 
    SubordinateViewAssignedTask, 
    SupervisorViewAssignedTask, 
    AssignTask, 
    ChangeTaskStatus, 
    ReassignTask
} = require('../Controllers/task');

const { SupervisorMiddleware, UserMiddleware } = require('../Middleware/Middleware');

router
  .route('/')
  .get(UserMiddleware, ViewTask)
  .put(UserMiddleware, AddTask)
  .patch(UserMiddleware, EditTask)
  .post(SupervisorMiddleware, AssignTask)
  .delete(UserMiddleware, DeleteTask);

router
  .route('/ViewTasks')
  .get(UserMiddleware, ViewAllTask)
  .post(UserMiddleware, ViewOwnTask)


router
  .route('/ViewAssignedTasks')
  .get(UserMiddleware, SubordinateViewAssignedTask)
  .post(SupervisorMiddleware, SupervisorViewAssignedTask)


router.post('/ChangeTaskStatus', UserMiddleware, ChangeTaskStatus); 
router.post('/ReassignTask', SupervisorMiddleware, ReassignTask);      

module.exports = router;
