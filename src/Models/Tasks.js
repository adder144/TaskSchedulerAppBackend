
const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    ownerID: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    assignedUserID: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    title: { type: String, required: true },
    description: { type: String, required: true },
    dueDate: { type: Date, required: true },
    category: { type: String, required: true },
    dependencyOnAnotherTask: { type: String },
    status: { 
        type: String, 
        required: true,
        enum: ['Pending', 'In Progress', 'Complete']
    },
});

module.exports = mongoose.model('Task', taskSchema);
