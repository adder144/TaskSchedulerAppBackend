const express = require('express');
const router = express.Router();

const taskRouter = require('./task');
const userRouter = require('./user');
const notificationRouter = require('./notification');

router.use('/tasks', taskRouter);
router.use('/users', userRouter);
router.use('/notification', notificationRouter);

module.exports = router;
