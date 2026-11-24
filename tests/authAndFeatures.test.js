const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

const app = require("../app");
const User = require("../models/user");
const URL = require("../models/url");
const { setUser, getUser } = require("../services/auth");

let mongoServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
});

beforeEach(async () => {
    await User.deleteMany({});
    await URL.deleteMany({});
});

afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
        await mongoServer.stop();
    }
});

describe("Authentication & Multi-Tenant Security Tests", () => {
    // 1. Password complexity validation
    test("should reject signup when password has no uppercase letter", async () => {
        const res = await request(app)
            .post("/user/signup")
            .send({
                username: "testuser",
                name: "Test User",
                email: "test@example.com",
                password: "password123!"
            });

        expect(res.status).toBe(200);
        expect(res.text).toContain("uppercase letter");
    });

    test("should reject signup when password has no lowercase letter", async () => {
        const res = await request(app)
            .post("/user/signup")
            .send({
                username: "testuser",
                name: "Test User",
                email: "test@example.com",
                password: "PASSWORD123!"
            });

        expect(res.status).toBe(200);
        expect(res.text).toContain("lowercase letter");
    });

    test("should reject signup when password has no number", async () => {
        const res = await request(app)
            .post("/user/signup")
            .send({
                username: "testuser",
                name: "Test User",
                email: "test@example.com",
                password: "PasswordSpecial!"
            });

        expect(res.status).toBe(200);
        expect(res.text).toContain("number");
    });

    test("should reject signup when password has no special character", async () => {
        const res = await request(app)
            .post("/user/signup")
            .send({
                username: "testuser",
                name: "Test User",
                email: "test@example.com",
                password: "Password1234"
            });

        expect(res.status).toBe(200);
        expect(res.text).toContain("special character");
    });

    test("should reject signup when password is less than 8 characters", async () => {
        const res = await request(app)
            .post("/user/signup")
            .send({
                username: "testuser",
                name: "Test User",
                email: "test@example.com",
                password: "Pass1!"
            });

        expect(res.status).toBe(200);
        expect(res.text).toContain("at least 8 characters");
    });

    // 2. Username validations
    test("should reject username containing spaces", async () => {
        const res = await request(app)
            .post("/user/signup")
            .send({
                username: "test user with space",
                name: "Test User",
                email: "test@example.com",
                password: "Password123!"
            });

        expect(res.status).toBe(200);
        expect(res.text).toContain("must not contain any spaces");
    });

    test("should reject username that is already taken", async () => {
        await request(app)
            .post("/user/signup")
            .send({
                username: "cooldev",
                name: "First Dev",
                email: "dev1@example.com",
                password: "Password123!"
            });

        const res = await request(app)
            .post("/user/signup")
            .send({
                username: "cooldev",
                name: "Second Dev",
                email: "dev2@example.com",
                password: "Password123!"
            });

        expect(res.status).toBe(200);
        expect(res.text).toContain("already taken");
    });

    // 3. Email format validation
    test("should reject invalid email without domain or @ symbol", async () => {
        const res = await request(app)
            .post("/user/signup")
            .send({
                username: "validuser",
                name: "Valid User",
                email: "invalid-email-string",
                password: "Password123!"
            });

        expect(res.status).toBe(200);
        expect(res.text).toContain("valid email address");
    });

    test("should reject duplicate email registration", async () => {
        await request(app)
            .post("/user/signup")
            .send({
                username: "userone",
                name: "User One",
                email: "same@example.com",
                password: "Password123!"
            });

        const res = await request(app)
            .post("/user/signup")
            .send({
                username: "usertwo",
                name: "User Two",
                email: "same@example.com",
                password: "Password123!"
            });

        expect(res.status).toBe(200);
        expect(res.text).toContain("already exists");
    });

    // 4. Successful Signup & Cookie setting
    test("should register a valid user and issue a JWT session cookie", async () => {
        const res = await request(app)
            .post("/user/signup")
            .send({
                username: "aayushdev",
                name: "Aayush Pradhan",
                email: "aayush@example.com",
                password: "SecurePassword123@"
            });

        expect(res.status).toBe(302);
        expect(res.headers.location).toBe("/");
        expect(res.headers["set-cookie"]).toBeDefined();
        expect(res.headers["set-cookie"][0]).toContain("token=");

        const saved = await User.findOne({ email: "aayush@example.com" });
        expect(saved).not.toBeNull();
        expect(saved.username).toBe("aayushdev");
        expect(saved.password).not.toBe("SecurePassword123@"); // Password must be hashed
    });

    // 5. Login by Username and by Email
    test("should allow login via email", async () => {
        await request(app)
            .post("/user/signup")
            .send({
                username: "tester1",
                name: "Tester",
                email: "tester1@example.com",
                password: "Password123!"
            });

        const loginRes = await request(app)
            .post("/user/login")
            .send({
                email: "tester1@example.com",
                password: "Password123!"
            });

        expect(loginRes.status).toBe(302);
        expect(loginRes.headers["set-cookie"]).toBeDefined();
    });

    test("should allow login via username", async () => {
        await request(app)
            .post("/user/signup")
            .send({
                username: "mycustomuser",
                name: "Tester",
                email: "custom@example.com",
                password: "Password123!"
            });

        const loginRes = await request(app)
            .post("/user/login")
            .send({
                email: "mycustomuser",
                password: "Password123!"
            });

        expect(loginRes.status).toBe(302);
        expect(loginRes.headers.location).toBe("/");
    });

    // 6. Master Admin Login
    test("should allow Master Admin to sign in with 'Aayush 27' credentials", async () => {
        const res = await request(app)
            .post("/user/login")
            .send({
                email: "Aayush 27",
                password: "Dateofbirth@27"
            });

        expect(res.status).toBe(302);
        expect(res.headers.location).toBe("/");

        const adminUser = await User.findOne({ role: "ADMIN" });
        expect(adminUser).not.toBeNull();
        expect(adminUser.role).toBe("ADMIN");
    });

    test("should reject Master Admin with incorrect password", async () => {
        const res = await request(app)
            .post("/user/login")
            .send({
                email: "Aayush 27",
                password: "WrongPassword123"
            });

        expect(res.status).toBe(200);
        expect(res.text).toContain("Invalid Admin password");
    });

    // 7. Multi-Tenant Link Isolation & CSV Export
    test("should export CSV containing only user's links for normal users", async () => {
        const user = await User.create({
            username: "regularuser",
            name: "Regular",
            email: "reg@test.com",
            password: "hashedpassword123",
            role: "NORMAL"
        });

        await URL.create({
            shortId: "reg-link",
            redirectURL: "https://google.com/",
            visitHistory: [],
            createdBy: user._id,
            aiMetadata: {
                summary: "Search engine",
                category: "Technology",
                tags: ["search"]
            }
        });

        const token = setUser(user);

        const res = await request(app)
            .get("/url/export/csv")
            .set("Cookie", [`token=${token}`]);

        expect(res.status).toBe(200);
        expect(res.headers["content-type"]).toContain("text/csv");
        expect(res.text).toContain("reg-link");
        expect(res.text).toContain("Technology");
        expect(res.text).toContain("Search engine");
    });

    test("should allow Master Admin to export all system-wide links in CSV", async () => {
        const admin = await User.create({
            username: "masteradmin",
            name: "Aayush 27",
            email: "admin@linkshort.local",
            password: "hashedpassword",
            role: "ADMIN"
        });

        await URL.create({
            shortId: "admin-global-link",
            redirectURL: "https://global.com/",
            visitHistory: [],
            aiMetadata: {
                summary: "Global website",
                category: "Technology",
                tags: ["web"]
            }
        });

        const token = setUser(admin);

        const res = await request(app)
            .get("/url/export/csv")
            .set("Cookie", [`token=${token}`]);

        expect(res.status).toBe(200);
        expect(res.text).toContain("admin-global-link");
    });

    test("should return JSON analytics format when requested via API / modal", async () => {
        const newUrl = await URL.create({
            shortId: "analytics-json-test",
            redirectURL: "https://github.com/",
            visitHistory: [
                { timestamp: Date.now(), device: "Mobile", browser: "Chrome", referrer: "Direct" },
                { timestamp: Date.now(), device: "Desktop", browser: "Firefox", referrer: "https://linkedin.com" }
            ]
        });

        const res = await request(app)
            .get(`/url/analytics/${newUrl.shortId}?format=json`);

        expect(res.status).toBe(200);
        expect(res.body.shortId).toBe("analytics-json-test");
        expect(res.body.totalClicks).toBe(2);
        expect(res.body.analytics.devices.Mobile).toBe(1);
        expect(res.body.analytics.devices.Desktop).toBe(1);
        expect(res.body.analytics.browsers.Chrome).toBe(1);
    });
});
