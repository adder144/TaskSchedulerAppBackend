const asyncHandler = require('express-async-handler');
const User = require('../Models/Users');
const Notification = require('../Models/Notification');


const ViewAllSubordinates = asyncHandler(async (req, res) => {
    console.log("/ViewAllSubordinates")
    try {
        const subordinates = await User.find({ userRole: 'Subordinate' });
        
        res.status(200).json(subordinates.map(subordinate => [subordinate._id, subordinate.userName]));
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving subordinates', error });
    }
  });
  
  const AddSubordinate = asyncHandler(async (req, res) => {
      console.log('/AddSubordinate');
    const { UserID } = req.body.params;
  
    try {
      const { SubordinateID } = req.query;
      const subordinate = await User.findById(SubordinateID);
        if (!subordinate) {
            return res.status(404).json({ message: 'No such user exists' });
        }
  
        const supervisor = await User.findById(UserID);
        if (supervisor.subordinateList.includes(SubordinateID)) {
            return res.status(400).json({ message: 'User is already a subordinate' });
        }
  
        supervisor.subordinateList.push(SubordinateID);
        subordinate.supervisorList.push(UserID);
  
        await supervisor.save();
        await subordinate.save();
        
        const notify = new Notification({
          receiverID: SubordinateID,
          note: `You Have a New Supervisor - ${supervisor.userName}`,
          alertType: 'New Supervisor',
          readStatus: 'Unread'
        });
        notify.save();
  
  
        res.status(200).json({ message: 'Subordinate added successfully' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error adding subordinate', error });
    }
  });

  const ViewSubordinateList = asyncHandler(async (req, res) => {
      console.log('/ViewSubordinateList')
      const { UserID } = req.body.params;
  
    try {
        const supervisor = await User.findById(UserID);
  
        if (!supervisor) {
            return res.status(404).json({ message: 'Wrong User' });
        }
  
        const subordinates = await User.find({ _id: { $in: supervisor.subordinateList } }, 'userName');
  
        res.status(200).json(subordinates.map(subordinate => ({ ID: subordinate._id, userName: subordinate.userName })));
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving subordinate list', error });
    }
  });


  const ViewSupervisorList = asyncHandler(async (req, res) => {
    console.log('/ViewSupervisorList');
    const { UserID } = req.body.params;
  
    try {
        const user = await User.findById(UserID);
  
        if (!user) {
            return res.status(404).json({ message: 'Wrong User' });
        }
  
        const supervisors = await User.find({ _id: { $in: user.supervisorList } }, 'userName');
  
        res.status(200).json(supervisors.map(supervisor => ({ ID: supervisor._id, userName: supervisor.userName })));
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving supervisors list', error });
    }
  });


  const RemoveSubordinate = asyncHandler(async (req, res) => {
      console.log('/RemoveSubordinate');
    const { UserID } = req.body.params;
  
    try {
      const { SubordinateID } = req.query;
      const supervisor = await User.findById(UserID);
        if (!supervisor.subordinateList.includes(SubordinateID)) {
            return res.status(404).json({ message: 'No such subordinate' });
        }
  
        supervisor.subordinateList = supervisor.subordinateList.filter(id => id.toString() !== SubordinateID);
  
        const subordinate = await User.findById(SubordinateID);
        subordinate.supervisorList = subordinate.supervisorList.filter(id => id.toString() !== UserID);
  
        await supervisor.save();
        await subordinate.save();
  
        const notify = new Notification({
          receiverID: SubordinateID,
          note: `Your Supervisor Has been Removed - ${supervisor.userName}`,
          alertType: 'Removed Supervisor',
          readStatus: 'Unread'
        });
        notify.save();
  
  
        res.status(200).json({ message: 'Subordinate removed successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error removing subordinate', error });
    }
  });
  
  module.exports = { 
    ViewAllSubordinates, 
    AddSubordinate, 
    ViewSubordinateList, 
    ViewSupervisorList, 
    RemoveSubordinate
  };

  

