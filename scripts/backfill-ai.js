const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");
const URL = require("../models/url");
const { analyzeURLContent } = require("../services/aiService");

async function backfillAIMetadata() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB.");

        const query = {
            $or: [
                { aiMetadata: { $exists: false } },
                { "aiMetadata.summary": "" },
                { "aiMetadata.summary": null },
                { "aiMetadata.summary": "Preview generated for web destination" },
                { "aiMetadata.summary": "AI analysis unavailable (API key missing)" }
            ]
        };

        const urlsToUpdate = await URL.find(query);
        console.log(`Found ${urlsToUpdate.length} link(s) needing AI summaries and tags.`);

        if (urlsToUpdate.length === 0) {
            console.log("All links already have AI metadata!");
            await mongoose.disconnect();
            return;
        }

        let updated = 0;
        for (const doc of urlsToUpdate) {
            console.log(`[${updated + 1}/${urlsToUpdate.length}] Analyzing: ${doc.redirectURL} (shortId: ${doc.shortId})`);
            try {
                const aiData = await analyzeURLContent(doc.redirectURL);
                doc.aiMetadata = aiData;
                await doc.save();
                updated++;
                console.log(`  -> Summary: ${aiData.summary}`);
                console.log(`  -> Category: ${aiData.category} | Tags: ${aiData.tags.join(", ")}`);
            } catch (err) {
                console.error(`  -> Failed for ${doc.shortId}:`, err.message);
            }
        }

        console.log(`\nSuccessfully backfilled AI metadata for ${updated} link(s)!`);
        await mongoose.disconnect();
    } catch (error) {
        console.error("Migration error:", error);
        process.exit(1);
    }
}

backfillAIMetadata();
