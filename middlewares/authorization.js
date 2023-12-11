const jwt = require('jsonwebtoken');
const YOUR_SECRET_KEY = process.env.SECRET_KEY;
require('dotenv').config();
const cookie = require('cookie');

const verifyToken = (req, res, next) => {
    try {
        const cookies = cookie.parse(req.headers.cookie);
        const clientToken = cookies.accessToken;
        const decoded = jwt.verify(clientToken, YOUR_SECRET_KEY);

        if(decoded) {
            res.locals.userId = decoded.userId;
            return next();
        } else {
            res.status(401).json({error: 'unauthorized'});
            console.log('토큰 인증 실패')
        }
    } catch(e) {
        res.status(401).json({error: 'token expired'});
    }
};

exports.verifyToken = verifyToken;