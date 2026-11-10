const QRCode = require("qrcode");
const shortid = require("shortid");
const URL = require("../models/url");


async function handleGenerateNewShortURL(req, res) {
    try {
        const body = req.body;

        if (!body.url) {
            return res.redirect("/?error=missing-url");
        }

        // Validate destination URL
        let parsedURL;

        try {
            parsedURL = new globalThis.URL(body.url);

            if (!["http:", "https:"].includes(parsedURL.protocol)) {
                throw new Error("Invalid protocol");
            }
        } catch (error) {
            return res.redirect("/?error=invalid-url");
        }

        // Generate short ID
        const shortID = body.customId && body.customId.trim()
            ? body.customId.trim()
            : shortid();
        if (!/^[a-zA-Z0-9_-]+$/.test(shortID)) {
            return res.redirect("/?error=invalid-alias");
        }
        if (shortID.length > 50) {
            return res.redirect("/?error=alias-too-long");
        }

        // Check whether custom ID already exists
        const existingURL = await URL.findOne({ shortId: shortID });

        if (existingURL) {
            return res.redirect("/?error=duplicate-alias");
        }

        // Calculate expiration date
        let expiresAt = null;

        const expiryDuration = body.expiryDuration;
        const expiryDate = body.expiryDate;

        if (expiryDuration && expiryDate) {
            return res.redirect("/?error=multiple-expiry");
        }

        if (expiryDuration) {
            const allowedDurations = [1, 7, 30, 90];
            const days = Number(expiryDuration);

            if (!allowedDurations.includes(days)) {
                return res.redirect("/?error=invalid-duration");
            }

            expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
        }

        else if (expiryDate) {
            const timezoneOffset = Number(body.timezoneOffset);
            if (
                !Number.isInteger(timezoneOffset) ||
                timezoneOffset < -840 ||
                timezoneOffset > 840
            ) {
                return res.redirect("/?error=invalid-timezone");
            }
            const [year, month, day] = expiryDate.split("-").map(Number);
            const selectedDate = new Date(
                Date.UTC(year, month - 1, day, 23, 59, 59, 999)
                + timezoneOffset * 60 * 1000
            );
            if (
                selectedDate.getUTCFullYear() !== year ||
                selectedDate.getUTCMonth() !== month - 1 ||
                selectedDate.getUTCDate() !== day
            ) {
                return res.redirect("/?error=invalid-date");
            }
            if (selectedDate <= new Date()) {
                return res.redirect("/?error=past-expiry");
            }
            expiresAt = selectedDate;
        }

        // Save URL in MongoDB
        await URL.create({
            shortId: shortID,
            redirectURL: parsedURL.href,
            visitHistory: [],
            expiresAt: expiresAt,
        });

       return res.redirect(`/?created=${encodeURIComponent(shortID)}`);

    } catch (error) {
        console.error("URL creation error:", error);
        if (error.code === 11000) {
            return res.redirect("/?error=duplicate-alias");
        }

        return res.status(500).send("Unable to create short URL.");
    }
}




async function handleGetAnalytics(req, res) {
    try {
        const shortId = req.params.shortId;

        const result = await URL.findOne({ shortId });

        if (!result) {
            return res.status(404).send("Short URL not found");
        }

        const visits = result.visitHistory || [];

        // Count device types
        const deviceStats = {};

        // Count browsers
        const browserStats = {};

        // Count traffic sources
        const sourceStats = {};

        visits.forEach((visit) => {

            // Device breakdown
            const device = visit.device || "Unknown";
            deviceStats[device] = (deviceStats[device] || 0) + 1;

            // Browser breakdown
            const browser = visit.browser || "Unknown";
            browserStats[browser] = (browserStats[browser] || 0) + 1;

            // Traffic source breakdown
            let source = "Direct";

            if (visit.referrer && visit.referrer !== "Direct") {
                try {
                    const parsedReferrer = new globalThis.URL(visit.referrer);
                    source = parsedReferrer.hostname.replace(/^www\./, "");
                } catch (error) {
                    source = "Other";
                }
            }

            sourceStats[source] = (sourceStats[source] || 0) + 1;

        });
        
        const baseURL = (process.env.BASE_URL || `${req.protocol}://${req.get("host")}`).replace(/\/$/, "");
        return res.render("analytics", {
            url: result,
            baseURL,
            totalClicks: visits.length,

            analytics: {
                devices: deviceStats,
                browsers: browserStats,
                sources: sourceStats
            }
        });

    } catch (error) {
        console.error("Analytics error:", error);
        return res.status(500).send("Unable to load analytics.");
    }
}


async function handleDeleteURL(req, res) {
    try {
        const shortId = req.params.shortId;

        const deletedURL = await URL.findOneAndDelete({ shortId });

        if (!deletedURL) {
            return res.status(404).send("Short URL not found");
        }

        return res.redirect("/");

    } catch (error) {
        console.error("URL deletion error:", error);
        return res.status(500).send("Unable to delete short URL.");
    }
}


async function handleEditURL(req, res) {
    try {
        const shortId = req.params.shortId;
        const { url } = req.body;

        if (!url || !url.trim()) {
           return res.redirect("/?error=missing-url");
        }

        let parsedURL;

        try {
            parsedURL = new globalThis.URL(url.trim());

            if (!["http:", "https:"].includes(parsedURL.protocol)) {
                throw new Error("Invalid protocol");
            }
        } catch (error) {
            return res.redirect("/?error=invalid-url");
        }

        const updatedURL = await URL.findOneAndUpdate(
            { shortId },
            { $set: { redirectURL: parsedURL.href } },
            { new: true, runValidators: true }
        );

        if (!updatedURL) {
            return res.status(404).send("Short URL not found");
        }

        return res.redirect("/");

    } catch (error) {
        console.error("Edit URL error:", error);
        return res.redirect("/?error=edit-failed");
    }
}


async function handleEditExpiration(req, res) {
    try {
        const shortId = req.params.shortId;

        const { expiryDuration, expiryDate } = req.body;

        let expiresAt = null;

        // Prevent selecting both options
        if (expiryDuration && expiryDate) {
           return res.redirect("/?error=multiple-expiry");
        }

        // Handle preset durations
        if (expiryDuration) {
            const allowedDurations = [1, 7, 30, 90];
            const days = Number(expiryDuration);

            if (!allowedDurations.includes(days)) {
                return res.redirect("/?error=invalid-duration");
            }

            expiresAt = new Date(
                Date.now() + days * 24 * 60 * 60 * 1000
            );
        }

        // Handle custom calendar date
        else if (expiryDate) {
            const timezoneOffset = Number(req.body.timezoneOffset);

            if (
                !Number.isInteger(timezoneOffset) ||
                timezoneOffset < -840 ||
                timezoneOffset > 840
            ) {
                return res.redirect("/?error=invalid-timezone");
            }

            const [year, month, day] = expiryDate.split("-").map(Number);

            const selectedDate = new Date(
                Date.UTC(year, month - 1, day, 23, 59, 59, 999)
                + timezoneOffset * 60 * 1000
            );

            if (
                selectedDate.getUTCFullYear() !== year ||
                selectedDate.getUTCMonth() !== month - 1 ||
                selectedDate.getUTCDate() !== day
            ) {
                return res.redirect("/?error=invalid-date");
            }

            if (selectedDate <= new Date()) {
                return res.redirect("/?error=past-expiry");
            }

            expiresAt = selectedDate;
        }

        // Update only the expiration field
        const updatedURL = await URL.findOneAndUpdate(
            { shortId },
            {
                $set: {
                    expiresAt: expiresAt
                }
            },
            {
                new: true,
                runValidators: true
            }
        );

        if (!updatedURL) {
            return res.status(404).send("Short URL not found");
        }

        return res.redirect("/");

    } catch (error) {
        console.error("Edit expiration error:", error);
        return res.redirect("/?error=expiration-failed");
    }
}



async function handleGenerateQRCode(req, res) {
    try {
        const shortId = req.params.shortId;

        const url = await URL.findOne({ shortId });

        if (!url) {
            return res.status(404).send("Short URL not found");
        }

        const baseURL = process.env.BASE_URL || `${req.protocol}://${req.get("host")}`;
        const shortURL = `${baseURL.replace(/\/$/, "")}/${url.shortId}`;

        const qrCode = await QRCode.toDataURL(shortURL);

        return res.render("qrcode", {
            qrCode,
            url,
            baseURL
        });

    } catch (error) {
        console.error("QR Code generation error:", error);
        return res.status(500).send("Unable to generate QR code");
    }
}

// Activate / Deactivate URL
async function handleToggleURLStatus(req, res) {
    try {
        const { shortId } = req.params;

        const url = await URL.findOne({ shortId });

        if (!url) {
            return res.status(404).send("Short URL not found");
        }

        url.isActive = !url.isActive;

        await url.save();

        return res.redirect('/');
    } catch (error) {
        console.error("Toggle URL status error:", error);
        return res.status(500).send("Unable to update link status");
    }
}

module.exports = {
    handleGenerateNewShortURL,
    handleGetAnalytics,
    handleDeleteURL,
    handleGenerateQRCode,
    handleEditURL,
    handleEditExpiration,
    handleToggleURLStatus,
};
