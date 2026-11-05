
const express = require("express");
const URL = require("../models/url");

const router = express.Router();

router.get("/", async (req, res) => {
    try {
        const allurls = await URL.find({}).sort({ createdAt: -1 });

        return res.render("home", {
            urls: allurls,
        });

    } catch (error) {
        console.error("Error fetching URLs:", error);
        return res.status(500).send("Unable to load dashboard");
    }
});

module.exports = router;
