const QRCode = require("qrcode");
const shortid = require("shortid");
const URL = require("../models/url");

async function handleGenerateNewShortURL(req, res) {
    const body = req.body;

    if (!body.url) {
        return res.status(400).send("URL is required");
    }

    // Validate URL
    let parsedURL;

    try {
        parsedURL = new globalThis.URL(body.url);

        if (!["http:", "https:"].includes(parsedURL.protocol)) {
            throw new Error("Invalid protocol");
        }
    } catch (error) {
        const allurls = await URL.find({});
        return res.status(400).render("home", {
            urls: allurls,
            error: "Please enter a valid URL starting with http:// or https://"
        });
    }

    const shortID = body.customId && body.customId.trim()
        ? body.customId.trim()
        : shortid();

    const existingURL =await URL.findOne ({ shortId: shortID});
    if (existingURL) {
        const allurls = await URL.find ({});

        return res.status(400).render("home",{
            urls: allurls,
            error:"This custom URL is already taken. Please choose another one.",
        });
    }

    await URL.create({
        shortId: shortID,
        redirectURL: parsedURL.href,
        visitHistory: [],
    });

    const allurls = await URL.find({});

    return res.render("home", {
        id: shortID,
        urls: allurls,
    });
}


async function handleGetAnalytics(req, res) {
    const shortId = req.params.shortId;

    const result = await URL.findOne({ shortId });

    if (!result) {
        return res.status(404).send("Short URL not found");
    }

    return res.render("analytics", {
        url: result,
        totalClicks: result.visitHistory.length,
    });
}

async function handleDeleteURL(req, res) {
    const shortId = req.params.shortId;

    const deletedURL = await URL.findOneAndDelete({ shortId });

    if (!deletedURL) {
        return res.status(404).send("Short URL not found");
    }

    return res.redirect("/");
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

module.exports = {
    handleGenerateNewShortURL,
    handleGetAnalytics,
    handleDeleteURL,
    handleGenerateQRCode,
};
