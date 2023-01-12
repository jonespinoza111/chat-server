import express from "express";
import http from "http";
import cors from 'cors';
import bodyparser from "body-parser";

const PORT = process.env.PORT || 5000;

import "./config/mongo.js";
import router from "./routes/index.js";
import userRouter from "./routes/user.js";

const app = express();

app.use(cors());
app.use(bodyparser.json());
app.use(express.json());
app.use(bodyparser.urlencoded({ extended: false }));

const server = http.createServer(app);

app.use("/", router);
app.use("/users", userRouter);

server.listen(PORT, () =>
    console.log(`The server is running now on PORT ${PORT}`)
);
