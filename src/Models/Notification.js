const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    receiverID: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    note: { type: String, required: true },
    alertType: { 
        type: String, 
        required: true,
        enum: ['New Supervisor','Removed Supervisor','Task Assign','Task Delete', 'Task Dismiss', 'Task Status Change', 'Task Edit']
    },
    createdAt: { type: Date, default: Date.now },
    readStatus: { 
        type: String, 
        required: true,
        enum: ['Unread', 'Read']
    }
});

module.exports = mongoose.model('Notification', notificationSchema);
