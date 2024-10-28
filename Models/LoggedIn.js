const mongoose = require('mongoose');

const loggedInSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    loginTime: { type: Date, default: Date.now }
});

module.exports = mongoose.model('LoggedIn', loggedInSchema);
