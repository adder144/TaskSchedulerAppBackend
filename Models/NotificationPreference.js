const mongoose = require('mongoose');

const notificationPreferenceSchema = new mongoose.Schema({
    UserID: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    TaskEditNotification: { type: String },
    TaskStatusChangeNotification: { type: String },
    TaskAssignNotification: { type: String },
    TaskDismissNotification : { type: String },
    TaskDeleteNotification : { type: String },
    NewSupervisorNotification : { type: String },
    RemovedSupervisorNotification : { type: String }
    
    
});

module.exports = mongoose.model('NotificationPreference', notificationPreferenceSchema);
