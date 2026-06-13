const mongoose = require('mongoose');

const profileImageSchema = new mongoose.Schema({
    _id:          { type: String, required: true },
    profileImage: { type: String, required: true },
});

module.exports = mongoose.model('ProfileImage', profileImageSchema);
