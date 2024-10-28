
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    userName: { type: String, required: true },
    userPassword: { type: String, required: true },
    userRole: { 
        type: String, 
        required: true,
        enum: ['Subordinate', 'Supervisor']
    },
    subordinateList: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false }],
    supervisorList: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false }], 
});

module.exports = mongoose.model('User', userSchema);
