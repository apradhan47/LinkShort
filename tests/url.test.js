const QRCode = require("qrcode");
const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

const app = require("../app");
const URL = require("../models/url");

let mongoServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();

    await mongoose.connect(mongoServer.getUri());
});

beforeEach(async () => {
    await URL.deleteMany({});
});

afterAll(async () => {
    await mongoose.disconnect();

    if (mongoServer) {
        await mongoServer.stop();
    }
});

describe("LinkShort URL Tests", () => {

    // 1. Create a short URL
    test("should create a short URL successfully", async () => {
        const response = await request(app)
            .post("/url")
            .send({
                url: "https://example.com",
                customId: "test-link"
            });

        expect(response.status).toBe(302);
        expect(response.headers.location).toContain("created=test-link");

        const savedURL = await URL.findOne({ shortId: "test-link" });

        expect(savedURL).not.toBeNull();
        expect(savedURL.redirectURL).toBe("https://example.com/");
    });

    // 2. Reject invalid URLs
    test("should reject invalid destination URLs", async () => {
        const response = await request(app)
            .post("/url")
            .send({
                url: "javascript:alert(1)",
                customId: "invalid-link"
            });

        expect(response.status).toBe(302);
        expect(response.headers.location).toContain("error=invalid-url");

        const savedURL = await URL.findOne({ shortId: "invalid-link" });

        expect(savedURL).toBeNull();
    });

    // 3. Reject duplicate aliases
    test("should reject duplicate custom aliases", async () => {
        await URL.create({
            shortId: "duplicate",
            redirectURL: "https://example.com"
        });

        const response = await request(app)
            .post("/url")
            .send({
                url: "https://google.com",
                customId: "duplicate"
            });

        expect(response.headers.location).toContain("error=duplicate-alias");
    });

    // 4. Redirect and track clicks
    test("should redirect and record visitor analytics", async () => {
        await URL.create({
            shortId: "redirect-test",
            redirectURL: "https://example.com"
        });

        const response = await request(app)
            .get("/redirect-test")
            .set("User-Agent", "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1")
            .set("Referer", "https://google.com");

        expect(response.status).toBe(302);
        expect(response.headers.location).toBe("https://example.com");

        const savedURL = await URL.findOne({ shortId: "redirect-test" });

        expect(savedURL.visitHistory).toHaveLength(1);
        expect(savedURL.visitHistory[0].device).toBe("Mobile");
        expect(savedURL.visitHistory[0].browser).toBe("Safari");
    });

    // 5. Handle missing short URLs
    test("should return 404 for a missing short URL", async () => {
        const response = await request(app).get("/does-not-exist");

        expect(response.status).toBe(404);
    });

    // 6. Handle expired URLs
    test("should reject expired URLs without recording a click", async () => {
        await URL.create({
            shortId: "expired-test",
            redirectURL: "https://example.com",
            expiresAt: new Date(Date.now() - 86400000)
        });

        const response = await request(app).get("/expired-test");

        expect(response.status).toBe(410);

        const savedURL = await URL.findOne({ shortId: "expired-test" });

        expect(savedURL.visitHistory).toHaveLength(0);
    });

    // 7. Handle disabled URLs
    test("should reject disabled URLs", async () => {
        await URL.create({
            shortId: "disabled-test",
            redirectURL: "https://example.com",
            isActive: false
        });

        const response = await request(app).get("/disabled-test");

        expect(response.status).toBe(403);
    });

    // 8. Edit destination URL
    test("should update the destination URL", async () => {
        await URL.create({
            shortId: "edit-test",
            redirectURL: "https://example.com"
        });

        const response = await request(app)
            .post("/url/edit/edit-test")
            .send({ url: "https://google.com" });

        expect(response.status).toBe(302);

        const savedURL = await URL.findOne({ shortId: "edit-test" });

        expect(savedURL.redirectURL).toBe("https://google.com/");
    });

    // 9. Toggle link status
    test("should deactivate an active URL", async () => {
        await URL.create({
            shortId: "toggle-test",
            redirectURL: "https://example.com"
        });

        const response = await request(app)
            .post("/url/toggle/toggle-test");

        expect(response.status).toBe(302);

        const savedURL = await URL.findOne({ shortId: "toggle-test" });

        expect(savedURL.isActive).toBe(false);
    });

    // 10. Delete URL
    test("should delete an existing URL", async () => {
        await URL.create({
            shortId: "delete-test",
            redirectURL: "https://example.com"
        });

        const response = await request(app)
            .post("/url/delete/delete-test");

        expect(response.status).toBe(302);

        const savedURL = await URL.findOne({ shortId: "delete-test" });

        expect(savedURL).toBeNull();
    });

    // 11. Load analytics
    test("should load analytics for an existing URL", async () => {
        await URL.create({
            shortId: "analytics-test",
            redirectURL: "https://example.com",
            visitHistory: [
                {
                    timestamp: Date.now(),
                    device: "Desktop",
                    browser: "Chrome",
                    referrer: "https://google.com"
                }
            ]
        });

        const response = await request(app)
            .get("/url/analytics/analytics-test");

        expect(response.status).toBe(200);
        expect(response.text).toContain("analytics-test");
    });

    // 12. Generate QR code
    test("should generate a QR code page", async () => {
        await URL.create({
            shortId: "qr-test",
            redirectURL: "https://example.com"
        });

        const response = await request(app)
            .get("/url/qrcode/qr-test");

        expect(response.status).toBe(200);
        expect(response.text).toContain("qr-test");
    });


    // 13. Reject invalid custom aliases
    test("should reject custom aliases containing invalid characters", async () => {
        const response = await request(app)
            .post("/url")
            .send({
                url: "https://example.com",
                customId: "bad alias"
            });

        expect(response.headers.location).toContain("error=invalid-alias");
    });

    // 14. Reject aliases exceeding 50 characters
    test("should reject custom aliases longer than 50 characters", async () => {
        const response = await request(app)
            .post("/url")
            .send({
                url: "https://example.com",
                customId: "a".repeat(51)
            });

        expect(response.headers.location).toContain("error=alias-too-long");
    });

    // 15. Reject requests without a URL
    test("should reject URL creation when destination is missing", async () => {
        const response = await request(app)
            .post("/url")
            .send({ customId: "missing-url" });

        expect(response.headers.location).toContain("error=missing-url");
    });

    // 16. Reject invalid expiry duration
    test("should reject unsupported expiry durations", async () => {
        const response = await request(app)
            .post("/url")
            .send({
                url: "https://example.com",
                customId: "invalid-expiry",
                expiryDuration: "15"
            });

        expect(response.headers.location).toContain("error=invalid-duration");
    });

    // 17. Reject multiple expiry options
    test("should reject requests containing both expiry options", async () => {
        const response = await request(app)
            .post("/url")
            .send({
                url: "https://example.com",
                customId: "multiple-expiry",
                expiryDuration: "7",
                expiryDate: "2099-12-31"
            });

        expect(response.headers.location).toContain("error=multiple-expiry");
    });

    // 18. Create URL with a custom expiry date
    test("should create a URL with a valid custom expiry date", async () => {
        const tomorrow = new Date(Date.now() + 86400000)
            .toISOString()
            .split("T")[0];

        const response = await request(app)
            .post("/url")
            .send({
                url: "https://example.com",
                customId: "custom-expiry",
                expiryDate: tomorrow,
                timezoneOffset: "0"
            });

        expect(response.headers.location).toContain("created=custom-expiry");

        const savedURL = await URL.findOne({ shortId: "custom-expiry" });

        expect(savedURL).not.toBeNull();
        expect(savedURL.expiresAt).toBeInstanceOf(Date);
        expect(savedURL.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    // 19. Reject invalid destination while editing
    test("should reject invalid destination URLs when editing", async () => {
        await URL.create({
            shortId: "invalid-edit",
            redirectURL: "https://example.com"
        });

        const response = await request(app)
            .post("/url/edit/invalid-edit")
            .send({ url: "javascript:alert(1)" });

        expect(response.headers.location).toContain("error=invalid-url");

        const savedURL = await URL.findOne({ shortId: "invalid-edit" });

        expect(savedURL.redirectURL).toBe("https://example.com");
    });

    // 20. Edit URL expiration
    test("should update the expiration duration of an existing URL", async () => {
        await URL.create({
            shortId: "edit-expiry",
            redirectURL: "https://example.com"
        });

        const response = await request(app)
            .post("/url/edit-expiration/edit-expiry")
            .send({ expiryDuration: "7" });

        expect(response.status).toBe(302);

        const savedURL = await URL.findOne({ shortId: "edit-expiry" });

        expect(savedURL.expiresAt).toBeInstanceOf(Date);
        expect(savedURL.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    // 21. Handle missing analytics records
    test("should return 404 for analytics of a missing URL", async () => {
        const response = await request(app)
            .get("/url/analytics/missing-analytics");

        expect(response.status).toBe(404);
    });

    // 22. Handle missing QR code records
    test("should return 404 when generating a QR code for a missing URL", async () => {
        const response = await request(app)
            .get("/url/qrcode/missing-qr");

        expect(response.status).toBe(404);
    });

    // 23. Check default values in the URL model
    test("should assign default values to a new URL", async () => {
        const savedURL = await URL.create({
            shortId: "defaults-test",
            redirectURL: "https://example.com"
        });

        expect(savedURL.isActive).toBe(true);
        expect(savedURL.expiresAt).toBeNull();
        expect(savedURL.visitHistory).toHaveLength(0);
    });

    // 24. Reject invalid destination URLs at database level
    test("should reject non-HTTP destination URLs in the model", async () => {
        const invalidURL = new URL({
            shortId: "schema-invalid",
            redirectURL: "javascript:alert(1)"
        });

        await expect(invalidURL.validate()).rejects.toThrow();
    });

    // 25. Reject invalid short IDs at database level
    test("should reject short IDs containing invalid characters", async () => {
        const invalidURL = new URL({
            shortId: "invalid alias",
            redirectURL: "https://example.com"
        });

        await expect(invalidURL.validate()).rejects.toThrow();
    });

    // 26. Activate a disabled URL
    test("should activate a previously disabled URL", async () => {
        await URL.create({
            shortId: "activate-test",
            redirectURL: "https://example.com",
            isActive: false
        });

        const response = await request(app)
            .post("/url/toggle/activate-test");

        expect(response.status).toBe(302);

        const savedURL = await URL.findOne({ shortId: "activate-test" });

        expect(savedURL.isActive).toBe(true);
    });

    // 27. Remove URL expiration
    test("should remove expiration when no expiry option is selected", async () => {
        await URL.create({
            shortId: "remove-expiry",
            redirectURL: "https://example.com",
            expiresAt: new Date(Date.now() + 86400000)
        });

        const response = await request(app)
            .post("/url/edit-expiration/remove-expiry")
            .send({});

        expect(response.status).toBe(302);

        const savedURL = await URL.findOne({ shortId: "remove-expiry" });

        expect(savedURL.expiresAt).toBeNull();
    });


    // 28. Load the dashboard successfully
    test("should load the dashboard", async () => {
        const response = await request(app).get("/");

        expect(response.status).toBe(200);
        expect(response.text).toContain("Dashboard");
    });

    // 29. Display URLs on the dashboard
    test("should display existing shortened URLs on the dashboard", async () => {
        await URL.create({
            shortId: "dashboard-test",
            redirectURL: "https://example.com",
            visitHistory: [
                {
                    timestamp: Date.now(),
                    device: "Desktop",
                    browser: "Chrome",
                    referrer: "Direct"
                }
            ]
        });

        const response = await request(app).get("/");

        expect(response.status).toBe(200);
        expect(response.text).toContain("dashboard-test");
        expect(response.text).toContain("Total Short Links");
    });

    // 30. Display dashboard error messages
    test.each([
        ["invalid-url", "Please enter a valid URL"],
        ["duplicate-alias", "This custom URL is already taken"],
        ["alias-too-long", "Custom alias cannot exceed 50 characters"],
        ["invalid-alias", "Custom alias can only contain"],
        ["missing-url", "Please enter a destination URL"],
        ["multiple-expiry", "Please select only one expiration option"],
        ["invalid-duration", "Invalid expiration duration"],
        ["invalid-timezone", "Invalid timezone information"],
        ["invalid-date", "Invalid expiration date"],
        ["past-expiry", "Expiration date must be in the future"],
        ["edit-failed", "Unable to update the destination URL"],
        ["expiration-failed", "Unable to update link expiration"]
    ])("should display the correct message for %s", async (errorCode, expectedMessage) => {
        const response = await request(app)
            .get("/")
            .query({ error: errorCode });

        expect(response.status).toBe(200);
        expect(response.text).toContain(expectedMessage);
    });


    // 31. Handle QR code generation errors
    test("should return 500 when QR code generation fails", async () => {
        await URL.create({
            shortId: "qr-error-test",
            redirectURL: "https://example.com"
        });

        const qrSpy = jest
            .spyOn(QRCode, "toDataURL")
            .mockRejectedValueOnce(new Error("QR generation failed"));

        const response = await request(app)
            .get("/url/qrcode/qr-error-test");

        expect(response.status).toBe(500);
        expect(response.text).toContain("Unable to generate QR code");

        qrSpy.mockRestore();
    });

    // 32. Handle toggling a missing URL
    test("should return 404 when toggling a URL that does not exist", async () => {
        const response = await request(app)
            .post("/url/toggle/nonexistent-toggle");

        expect(response.status).toBe(404);
        expect(response.text).toContain("Short URL not found");
    });

    // 33. Handle errors while toggling URL status
    test("should return 500 when saving URL status fails", async () => {
        await URL.create({
            shortId: "toggle-error-test",
            redirectURL: "https://example.com"
        });

        const saveSpy = jest
            .spyOn(URL.prototype, "save")
            .mockRejectedValueOnce(new Error("Database save failed"));

        const response = await request(app)
            .post("/url/toggle/toggle-error-test");

        expect(response.status).toBe(500);
        expect(response.text).toContain("Unable to update link status");

        saveSpy.mockRestore();
    });


});
