import mongoose from "mongoose";
import config from "./index.js";

const CONNECTION_URL = `mongodb+srv://${config.cluster.username}:${config.cluster.password}@${config.cluster.name}.yvvpgsx.mongodb.net/${config.cluster.db}?retryWrites=true&w=majority&authSource=admin`;

mongoose.connect(CONNECTION_URL);

mongoose.connection.on("connected", () => {
    console.log("Mongo has connected succesfully");
});
mongoose.connection.on("reconnected", () => {
    console.log("Mongo has reconnected");
});
mongoose.connection.on("error", (error) => {
    console.log("Mongo connection has an error", error);
    mongoose.disconnect();
});
mongoose.connection.on("disconnected", () => {
    console.log("Mongo connection is disconnected");
});

mongoose.set('strictQuery', true);