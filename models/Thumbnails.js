const mongoose = require('mongoose');

const thumbnailSchema = mongoose.Schema({
    id: mongoose.Schema.ObjectId,
    schoolName: { type: String, require: true },
    imgUrl: { type: String, trim: true },
    orderIdx: { type: Number, require: true },
}, { versionKey: false });

const Thumbnail = mongoose.model('Thumbnail', thumbnailSchema, 'thumbnails');

module.exports = { Thumbnail };