import 'dotenv/config';
import express from "express";
import http from "http";
import cors from 'cors';
import socketio from "socket.io";
import bodyparser from "body-parser";

const PORT = process.env.PORT || 5000;

import "./config/mongo.js";
import router from "./routes/index.js";
import userRouter from "./routes/user.js";
import WebSockets from "./utils/WebSockets.js";

import multer from 'multer';
import { getFileStream, uploadImage } from "./config/s3.js";

import fs from 'fs';
import util from 'util';
const unlinkFile = util.promisify(fs.unlink);

const app = express();

app.use(cors());
app.use(bodyparser.json());
app.use(express.json());
app.use(bodyparser.urlencoded({ extended: false }));

const server = http.createServer(app);

global.io = socketio.listen(server);
global.io.on("connection", function(client) {
    WebSockets.connection(client);
    console.log(' someone has logged in right now', client.id);
});

const upload = multer({ dest: 'uploads/' });

app.use("/", router);
app.use("/users", userRouter);

app.get("/images/:key", (req, res) => {
    const key = req.params.key;
    const readStream = getFileStream(key);
    readStream.pipe(res);
})

app.post("/images", upload.array('images', 4), async (req, res) => {

    const results = await Promise.all(req.files.map(async (file) => {
        return await uploadImage(file);
    }))


    req.files.map(async (file) => {
        return await unlinkFile(file.path);
    });

    const imagePaths = results.map(result => `/images/${result.key}`);

    res.send({ results, imagePaths });
});

server.listen(PORT, () =>
    console.log(`The server is running now on PORT ${PORT}`)
);
