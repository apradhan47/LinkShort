
const rateLimit = require("express-rate-limit");

// Limit URL creation requests
const createURLLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: "Too many URL creation requests. Please try again after 15 minutes."
});

// Limit redirect requests
const redirectLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: "Too many requests. Please try again after 15 minutes."
});

module.exports = {
    createURLLimiter,
    redirectLimiter
};
