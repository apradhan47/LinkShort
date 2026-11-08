
require('dotenv').config();

const express = require("express");
const path = require('path');
const { connectToMongoDB } = require("./connect");
const { redirectLimiter } = require('./middlewares/rateLimiter');


const urlRoute = require("./routes/url");
const URL = require("./models/url");
const staticRoute = require('./routes/staticRouter');

const app = express();
app.set("trust proxy", 1);

app.set("view engine", "ejs");
app.set('views', path.resolve("./views"));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/url", urlRoute);
app.use("/", staticRoute);

app.get('/:shortId', redirectLimiter, async (req, res) => {
    try {
        const shortId = req.params.shortId;

        // Find the shortened URL
        const entry = await URL.findOne({ shortId });

        if (!entry) {
            return res.status(404).send("Short URL not found");
        }

        // Check whether the link has expired
        if (entry.expiresAt && entry.expiresAt <= new Date()) {
            return res.status(410).send("This link has expired.");
        }

        if (entry.isActive === false) {
            return res.status(403).send("This link is currently disabled");
        }

        // Get visitor information
        const userAgent = req.headers["user-agent"] || "Unknown";
        const referrer = req.get("referer") || "Direct";

        // Identify device
        let device = "Desktop";

        if (/tablet|ipad/i.test(userAgent)) {
            device = "Tablet";
        } else if (/mobile|android|iphone|ipod/i.test(userAgent)) {
            device = "Mobile";
        }

        // Identify browser
        let browser = "Other";

        if (/edg/i.test(userAgent)) {
            browser = "Edge";
        } else if (/opr|opera/i.test(userAgent)) {
            browser = "Opera";
        } else if (/chrome/i.test(userAgent)) {
            browser = "Chrome";
        } else if (/firefox/i.test(userAgent)) {
            browser = "Firefox";
        } else if (/safari/i.test(userAgent)) {
            browser = "Safari";
        }

        // Record visit and analytics information
        await URL.findOneAndUpdate(
            { shortId },
            {
                $push: {
                    visitHistory: {
                        timestamp: Date.now(),
                        userAgent: userAgent,
                        device: device,
                        browser: browser,
                        referrer: referrer,
                        country: "Unknown"
                    }
                }
            }
        );

        // Redirect to destination
        return res.redirect(entry.redirectURL);

    } catch (error) {
        console.error(error);
        res.status(500).send("Something went wrong");
    }
});

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
