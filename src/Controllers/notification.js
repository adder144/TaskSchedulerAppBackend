const asyncHandler = require('express-async-handler');
const NotificationPreference = require('../Models/NotificationPreference');
const Notification = require('../Models/Notification');

const GetNotifications = asyncHandler(async (req, res)=>{
    const { UserID } = req.body.params;
    try{
        const notifications = await Notification.find({ receiverID: UserID }).sort({ readStatus: -1, createdAt: -1 });
        const notificationPreference = await NotificationPreference.find({ UserID: UserID})
        if(!notificationPreference) notificationPreference = null;
        return res.status(200).json({ message: 'Notifications retrieved successfully', notifications, notificationPreference });
    }catch(err){
        console.log("Error: " + err)
        return res.status(500).json({ message: 'Error Retriving Notifications',err})
    }
})
const GetUnreadNotifications = asyncHandler(async (req, res)=>{
    const { UserID } = req.body.params;
    try{
        const notifications = await Notification.find({ receiverID: UserID, readStatus: "Unread" }).sort({ createdAt: -1 });
        const notificationPreference = await NotificationPreference.find({ UserID: UserID})
        if(!notificationPreference) notificationPreference = null;
        return res.status(200).json({ message: 'Notifications retrieved successfully', notifications, notificationPreference });
    }catch(err){
        console.log("Error: " + err)
        return res.status(500).json({ message: 'Error Retriving Notifications',err})
    }
})

const MarkAllNotificationAsRead = asyncHandler(async (req, res)=>{
    const { UserID } = req.body.params;
    try{
        await Notification.updateMany({ receiverID: UserID, readStatus: "Unread" },{ $set: { readStatus: "Read" } } );
        return res.status(200).json({ message: 'All Notifications Marked As Read' });
    }catch(err){
        console.log("Error: " + err)
        return res.status(500).json({ message: 'Error Marking All Notifications As Read',err})
    }
})

const MarkNotificationAsRead = asyncHandler(async (req, res)=>{
    const { UserID } = req.body.params;
    try{
        const { NotificationID } = req.query;
        const notification = await Notification.findById(NotificationID);
        if ( !notification ) {
            return res.status(404).json({ message: 'Notification Not Found' });
        }
        notification.readStatus = "Read";
        notification.save();
        return res.status(200).json({ message: 'Notification Marked As Read', notification });
    }catch(err){
        console.log("Error: " + err)
        return res.status(500).json({ message: 'Error Marking Notification As Read',err})
    }
});

const GetNotificationPreference = asyncHandler(async (req, res)=>{
    const { UserID } = req.body.params;
    try{
        const notificationPreference = await NotificationPreference.find({ UserID: UserID})
        if(!notificationPreference || notificationPreference.length == 0) {return res.status(404).json({ message: 'You Have No Set Notification Preference' });};
        return res.status(200).json({ message: 'Notification Preference retrieved successfully', notificationPreference });
    }catch(err){
        console.log("Error: " + err)
        return res.status(500).json({ message: 'Error Retriving Notification Preference',err})
    }
});

const SetNotificationPreference = asyncHandler(async (req, res) => {
    const { UserID } = req.body.params;
    try {
        const {
            TaskEditNotification,
            TaskStatusChangeNotification,
            TaskAssignNotification,
            TaskDismissNotification,
            TaskDeleteNotification,
            NewSupervisorNotification,
            RemovedSupervisorNotification
        } = req.query;
    
        let notificationPreference = await NotificationPreference.findOne({ UserID: UserID });
        
        if (!notificationPreference) {
            notificationPreference = new NotificationPreference({
                UserID,
                TaskEditNotification : TaskEditNotification || "Default",
                TaskStatusChangeNotification : TaskStatusChangeNotification || "Default",
                TaskAssignNotification : TaskAssignNotification || "Default",
                TaskDismissNotification : TaskDismissNotification || "Default",
                TaskDeleteNotification : TaskDeleteNotification || "Default",
                NewSupervisorNotification : NewSupervisorNotification || "Default",
                RemovedSupervisorNotification : RemovedSupervisorNotification || "Default"
            });
            await notificationPreference.save();
            return res.status(200).json({ message: 'Notification Preference Created Successfully', notificationPreference });
        } else {
            // Update existing preference
            if (TaskEditNotification !== undefined) notificationPreference.TaskEditNotification = TaskEditNotification;
            if (TaskStatusChangeNotification !== undefined) notificationPreference.TaskStatusChangeNotification = TaskStatusChangeNotification;
            if (TaskAssignNotification !== undefined) notificationPreference.TaskAssignNotification = TaskAssignNotification;
            if (TaskDismissNotification !== undefined) notificationPreference.TaskDismissNotification = TaskDismissNotification;
            if (TaskDeleteNotification !== undefined) notificationPreference.TaskDeleteNotification = TaskDeleteNotification;
            if (NewSupervisorNotification !== undefined) notificationPreference.NewSupervisorNotification = NewSupervisorNotification;
            if (RemovedSupervisorNotification !== undefined) notificationPreference.RemovedSupervisorNotification = RemovedSupervisorNotification;

            await notificationPreference.save();
            return res.status(200).json({ message: 'Notification Preference Updated Successfully', notificationPreference });
        }
    } catch (err) {
        console.log("Error: " + err);
        return res.status(500).json({ message: 'Error Creating or Updating Notification Preference', err });
    }
});

module.exports = { 
    GetNotifications, 
    GetUnreadNotifications, 
    MarkAllNotificationAsRead, 
    MarkNotificationAsRead, 
    GetNotificationPreference, 
    SetNotificationPreference
  };