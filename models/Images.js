const mongoose = require('mongoose');

const imageSchema = mongoose.Schema({
    id: mongoose.Schema.ObjectId,
    schoolName: { type: String, require: true },
    orderIdx: { type: Number, require: true },
    isThumbnail: {type: Boolean, require: true},
    imgUrl: { type: String, trim: true },
    imgAlt: { type: String }
}, { versionKey: false });

const Image = mongoose.model('Image', imageSchema, 'images');

module.exports = { Image };