
require("dotenv").config();

const app = require("./app");
const { connectToMongoDB } = require("./connect");

const PORT = process.env.PORT || 8001;

connectToMongoDB(process.env.MONGODB_URI)
    .then(() => {
        console.log("MongoDB Atlas connected!");

        app.listen(PORT, () => {
            console.log(`Server started at PORT: ${PORT}`);
        });
    })
    .catch((err) => {
        console.error("MongoDB connection failed:", err);
        process.exit(1);
    });
