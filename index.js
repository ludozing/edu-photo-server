const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const https = require('https');
const http = require('http');
const fs = require('fs');
const multer = require('multer');

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const YOUR_SECRET_KEY = process.env.SECRET_KEY;
const cookie = require('cookie');
const server = http.createServer(app);

server.listen(8008, () => console.log('API https Server Connected at port 8008'));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use('/static', express.static('static'));
app.use(cors({ origin: 'https://edu.redmetas.com', credentials: true }));
// app.use(cors({ origin: 'http://localhost:3000' }));

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const schoolId = file.originalname.split('_')[0];
        const path = `static/images/${schoolId}`;
        if (!fs.existsSync(path)) fs.mkdirSync(path);
        cb(null, path);

    },
    filename: function (req, file, cb) {
        const fileName = file.originalname.split('_')[1]
        cb(null, fileName);
    }
})
const upload = multer({ storage: storage });


const mongoose = require('mongoose');
const { Thumbnail } = require('./models/Thumbnails');
const { Image } = require('./models/Images');

mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true, useUnifiedTopology: true
}).then(() => console.log('MongoDB connected...'))
    .catch(error => console.log(error));

const { verifyToken } = require('./middlewares/authorization');

app.get('/', (req, res) => {
    res.status(200).json({ success: true });
});

app.get('/getThumbnails', async (req, res) => {
    const thumbnails = await Thumbnail.find({}).sort('orderIdx');
    try {
        return res.status(200).json(thumbnails);
    } catch (err) { return res.status(500).json({ error: err }); }
});

app.post('/getImages', async (req, res) => {
    const { schoolName } = req.body;
    const images = await Image.find({ schoolName }).sort('orderIdx');
    const schoolData = await Thumbnail.findOne({ "_id": schoolName });
    try {
        return res.status(200).json({ schoolName: schoolData.schoolName, images: images });
    } catch (err) { return res.status(500).json({ error: err }); }
});

app.post('/editSchoolList', verifyToken, async (req, res) => {
    const { editedData, deletedData } = req.body;
    console.log(editedData);
    deletedData.forEach(async element => {
        await Thumbnail.findOneAndDelete({ "_id": element });
    });
    editedData.forEach(async element => {
        if (element._id === '') {
            const thumbnail = new Thumbnail({
                schoolName: element.schoolName,
                imgUrl: element.imgUrl,
                orderIdx: parseInt(element.orderIdx)
            });
            thumbnail.save();
        } else {
            await Thumbnail.findOneAndReplace({ "_id": element._id }, element);
        }
    });
    try {
        return res.status(200).json({ success: true });
    } catch (err) { return res.status(500).json({ error: err }); }
});

app.post('/uploadImg', verifyToken, upload.array('files'), async (req, res) => {
    // let file =  req.file;
    try {
        return res.status(200).json({ success: true });
    } catch (err) { return res.status(500).json({ error: err }); }
})

app.post('/editGallery', verifyToken, async (req, res) => {
    const { editedData, deletedData } = req.body;
    console.log(deletedData);
    for (const delData of deletedData) {
        const thatData = await Image.findOne({ "_id": delData });
        const schoolName = thatData.schoolData;
        const fileUrl = thatData.imgUrl;
        if (thatData.isThumbnail) {
            await Thumbnail.findOneAndUpdate({ "_id": schoolName }, { imgUrl: '' });
            await Image.findOneAndDelete({ "_id": delData });
            fs.unlinkSync(`static/${fileUrl}`);
        } else {
            await Image.findOneAndDelete({ "_id": delData });
            fs.unlinkSync(`static/${fileUrl}`);
        };
    }
    for (const data of editedData) {
        if (data.isThumbnail) {
            if (data._id === '') {
                const url = `/images/${data.schoolName}/${data.tempId}.${data.fileExtension}`;
                await Thumbnail.findOneAndUpdate({ "_id": data.schoolName }, { imgUrl: url });
            } else {
                const url = data.imgUrl;
                await Thumbnail.findOneAndUpdate({ "_id": data.schoolName }, { imgUrl: url });
            }
        }
        if (data._id === '') {
            const imageData = new Image({
                schoolName: data.schoolName,
                orderIdx: data.orderIdx,
                isThumbnail: data.isThumbnail,
                imgUrl: `/images/${data.schoolName}/${data.tempId}.${data.fileExtension}`,
                imgAlt: ''
            });
            imageData.save();
        } else {
            await Image.findOneAndReplace({ "_id": data._id }, data);
        }
    }
    try {
        return res.status(200).json({ success: true });
    } catch (err) { return res.status(500).json({ error: err }); }
});

app.post('/adminLogin', async (req, res) => {
    const { adminId, adminPw } = req.body;
    // const salt = await bcrypt.genSalt(10);
    // const newPw = await bcrypt.hash(adminPw, salt);
    const validPassword = await bcrypt.compare(adminPw, '$2b$10$PnVNU0vW5fBc51sNdW5.IuX/fj1wOJ5q6pf2y.3imYWaMYIIai5be');
    const refreshToken = jwt.sign({}, YOUR_SECRET_KEY, {expiresIn: '14d'});

    if (adminId === 'admin' && validPassword) {
        try {
            const accessToken = jwt.sign({
                userId: adminId
            }, YOUR_SECRET_KEY, {
                expiresIn: '1h'
            });
            res.cookie('accessToken', accessToken, {
                httpOnly: true,
                sameSite: 'none',
                secure: true,
                maxAge: 3600000
            });
            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                sameSite: 'none',
                secure: true,
                maxAge: 1209600000
            });
            res.status(201).json({
                accessToken: accessToken,
                refreshToken: refreshToken,
                success: true
            });
        } catch (err) { return res.status(500).json({ error: err }); }
    } else {
        try {
            return res.status(200).json({ success: false });
        } catch (err) { return res.status(500).json({ error: err }); }
    }
});

app.post('/silent-refresh', verifyToken, async (req, res) => {
    try {
        const cookies = cookie.parse(req.headers.cookie);
        const refreshToken = cookies.refreshToken;
        console.log(refreshToken)
        const decoded = jwt.verify(refreshToken, YOUR_SECRET_KEY);
        if (decoded) {
            try {
                const newAccessToken = jwt.sign({
                    userId: res.locals.userId
                }, YOUR_SECRET_KEY, {
                    expiresIn: '1h'
                });
                console.log('토큰 갱신 성공')
                res.cookie('accessToken', newAccessToken, {
                    httpOnly: true,
                    sameSite: 'none',
                    secure: true,
                    maxAge: 3600000
                });
                res.send(newAccessToken);
            } catch (e) {
                console.error(e)
            }
        } else {
            res.status(401).json({ error: 'refreshToken unauthorized' });
        }
    } catch (e) {
        res.status(401).json({ error: 'refreshToken expired' });
    }
});