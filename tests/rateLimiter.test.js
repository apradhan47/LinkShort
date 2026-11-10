
const express = require("express");
const request = require("supertest");

const {
    createURLLimiter,
    redirectLimiter
} = require("../middlewares/rateLimiter");

const app = express();

app.use(express.json());

app.post("/test-create", createURLLimiter, (req, res) => {
    res.status(200).send("URL creation allowed");
});

app.get("/test-redirect", redirectLimiter, (req, res) => {
    res.status(200).send("Redirect allowed");
});

describe("Rate Limiting Tests", () => {

    test("should block URL creation after 20 requests", async () => {
        let response;

        for (let i = 0; i < 20; i++) {
            response = await request(app).post("/test-create");
            expect(response.status).toBe(200);
        }

        response = await request(app).post("/test-create");

        expect(response.status).toBe(429);
    });

    test("should block redirects after 100 requests", async () => {
        let response;

        for (let i = 0; i < 100; i++) {
            response = await request(app).get("/test-redirect");
            expect(response.status).toBe(200);
        }

        response = await request(app).get("/test-redirect");

        expect(response.status).toBe(429);
    });

});
