const { GoogleGenAI } = require("@google/genai");

async function analyzeURLContent(url) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return {
            summary: "AI analysis unavailable (API key missing)",
            tags: ["General"],
            category: "General"
        };
    }

    const ai = new GoogleGenAI({ apiKey });

    try {
        const prompt = `Analyze this URL: ${url}
Provide a brief 1-sentence summary of what this website/link is about, assign a primary category, and give 2-4 short keyword tags.
Respond in strict JSON format:
{
  "summary": "1 sentence summary here",
  "category": "Technology/Design/News/E-Commerce/Productivity/Other",
  "tags": ["tag1", "tag2"]
}`;

        const response = await ai.models.generateContent({
            model: "gemini-3.5-flash-lite",
            contents: prompt,
            config: {
                responseMimeType: "application/json"
            }
        });

        const data = JSON.parse(response.text);
        return {
            summary: data.summary || "No summary available",
            tags: Array.isArray(data.tags) ? data.tags : ["Web"],
            category: data.category || "General"
        };
    } catch (error) {
        console.error("AI Analysis error:", error.message);
        return {
            summary: "Preview generated for web destination",
            tags: ["Link"],
            category: "General"
        };
    }
}

module.exports = { analyzeURLContent };