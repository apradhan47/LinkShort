const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "linkshort_super_secure_jwt_secret_key_2026";

function setUser(user) {
    return jwt.sign(
        {
            _id: user._id,
            email: user.email,
            username: user.username || user.name,
            name: user.name,
            role: user.role,
        },
        JWT_SECRET,
        { expiresIn: "7d" }
    );
}

function getUser(token) {
    if (!token) return null;
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
}

module.exports = {
    setUser,
    getUser,
};
