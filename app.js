
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");

const { redirectLimiter } = require("./middlewares/rateLimiter");
const { checkAuth } = require("./middlewares/auth");

const urlRoute = require("./routes/url");
const URL = require("./models/url");
const staticRoute = require("./routes/staticRouter");
const userRoute = require("./routes/user");

const app = express();

app.set("trust proxy", 1);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.get("/favicon.ico", (req, res) => res.sendFile(path.join(__dirname, "public", "favicon.ico")));
app.use(checkAuth);

app.use("/url", urlRoute);
app.use("/user", userRoute);
app.use("/", staticRoute);

app.get("/:shortId", redirectLimiter, async (req, res) => {
    try {
        const shortId = req.params.shortId;

        const entry = await URL.findOne({ shortId });

        if (!entry) {
            return res.status(404).send("Short URL not found");
        }

        if (entry.expiresAt && entry.expiresAt <= new Date()) {
            return res.status(410).send("This link has expired.");
        }

        if (entry.isActive === false) {
            return res.status(403).send("This link is currently disabled");
        }

        const userAgent = req.headers["user-agent"] || "Unknown";
        const referrer = req.get("referer") || "Direct";

        let device = "Desktop";

        if (/tablet|ipad/i.test(userAgent)) {
            device = "Tablet";
        } else if (/mobile|android|iphone|ipod/i.test(userAgent)) {
            device = "Mobile";
        }

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

        await URL.findOneAndUpdate(
            { shortId },
            {
                $push: {
                    visitHistory: {
                        timestamp: Date.now(),
                        userAgent,
                        device,
                        browser,
                        referrer,
                        country: "Unknown"
                    }
                }
            }
        );

        return res.redirect(entry.redirectURL);

    } catch (error) {
        console.error(error);
        return res.status(500).send("Something went wrong");
    }
});

module.exports = app;
