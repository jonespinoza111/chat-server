import jwt from "jsonwebtoken";
import UserModel from "../models/User.js";

export const encode = async (req, res, next) => {
    try {
        const { username, password } = req.body.userData;
        const user = await UserModel.findOne({ username });
        if (user.password === password) {
            const payload = {
                uid: user._id,
                username: user.username,
                profilePic: user.profilePic,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email

            };
            const authToken = jwt.sign(payload, process.env.JWT_SECRET_KEY);
            req.authToken = authToken;
            next();
        } else {
            return res.status(400).json({ success: false, message: "The username or password you entered is not correct"})
        }
    } catch (err) {
        return res.status(400).json({ success: false, message: err.error });
    }
};

export const decode = (req, res, next) => {
    if (!req.headers['authorization']) {
        return res.status(400).json({ success: false, message: 'No access token found' })
    }
    const accessToken = req.headers.authorization.split('')[1];
    try {
        const decoded = jwt.verify(accessToken, process.env.JWT_SECRET_KEY);
        req.uid = decoded.uid;
        return next()
    } catch (err) {
        return res.status(401).json({ success: false, message: err.messsage })
    }
};
