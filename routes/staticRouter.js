const QRCode = require("qrcode");
const express = require("express");
const URL = require("../models/url");

const router = express.Router();

router.get("/", async (req, res) => {
    try {
        const allurls = await URL.find({}).sort({ createdAt: -1 });
        const baseURL = (process.env.BASE_URL || `${req.protocol}://${req.get("host")}`).replace(/\/$/, "");
        const urlsWithQR = await Promise.all(
            allurls.map(async (url) => {
                const shortURL = `${baseURL}/${url.shortId}`;
                const qrCode = await QRCode.toDataURL(shortURL);
                return {
                    ...url.toObject(),
                    qrCode
                };
            })
        );

        // Calculate dashboard analytics
        const totalLinks = allurls.length;

        const totalClicks = allurls.reduce(
            (total, url) => total + url.visitHistory.length,
            0
        );

        const activeLinks = allurls.filter(
            url => 
                url.isActive!== false &&
                (!url.expiresAt || new Date(url.expiresAt) > new Date())
        ).length;

        const disabledLinks = allurls.filter(
            url => 
                url.isActive === false &&
                (!url.expiresAt || new Date(url.expiresAt) > new Date())
        ).length;

        const expiredLinks = allurls.filter(
            url => url.expiresAt && new Date(url.expiresAt) <= new Date()
        ).length;

        // Calculate daily clicks for the last 7 days
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const dailyClicks = [];

        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);

            const nextDate = new Date(date);
            nextDate.setDate(date.getDate() + 1);

            let clicks = 0;

            allurls.forEach(url => {
                url.visitHistory.forEach(visit => {
                    const visitDate = new Date(visit.timestamp);

                    if (visitDate >= date && visitDate < nextDate) {
                        clicks++;
                    }
                });
            });

            dailyClicks.push({
                date: date.toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short"
                }),
                clicks
            });
        }

        return res.render("home", {
            urls: urlsWithQR,
            baseURL,
            id: req.query.created,
            error: req.query.error === "invalid-url"
               ? "Please enter a valid URL starting with http:// or https://"
               : req.query.error === "duplicate-alias"
               ? "This custom URL is already taken. Please choose another one."
               : req.query.error === "alias-too-long"
               ? "Custom alias cannot exceed 50 characters."
               : req.query.error === "invalid-alias"
               ? "Custom alias can only contain letters, numbers, hyphens, and underscores."
               : req.query.error === "missing-url"
               ? "Please enter a destination URL."
               : req.query.error === "multiple-expiry"
               ? "Please select only one expiration option."
               : req.query.error === "invalid-duration"
               ? "Invalid expiration duration. Please choose 1, 7, 30, or 90 days."
               : req.query.error === "invalid-timezone"
               ? "Invalid timezone information. Please try again."
               : req.query.error === "invalid-date"
               ? "Invalid expiration date. Please select a valid date."
               : req.query.error === "past-expiry"
               ? "Expiration date must be in the future."
               : req.query.error === "edit-failed"
               ? "Unable to update the destination URL. Please try again."
               : req.query.error === "expiration-failed"
               ? "Unable to update link expiration. Please try again."
               : null, 


            dashboardStats: {
                totalLinks,
                totalClicks,
                activeLinks,
                disabledLinks,
                expiredLinks
            },
            dailyClicks
        });

    } catch (error) {
        console.error("Error fetching URLs:", error);
        return res.status(500).send("Unable to load dashboard");
    }
});

module.exports = router;
