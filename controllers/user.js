const bcrypt = require("bcryptjs");
const User = require("../models/user");
const { setUser } = require("../services/auth");

const ADMIN_USERNAME = "Aayush 27";
const ADMIN_PASSWORD = "Dateofbirth@27";
const ADMIN_EMAIL = "admin@linkshort.local";

async function ensureAdminExists() {
    try {
        let admin = await User.findOne({ role: "ADMIN" });
        if (!admin) {
            const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
            admin = await User.create({
                username: "aayush27",
                name: ADMIN_USERNAME,
                email: ADMIN_EMAIL,
                password: hashedPassword,
                role: "ADMIN"
            });
            console.log("Master Admin initialized: 'Aayush 27'");
        }
        return admin;
    } catch (e) {
        console.error("Error creating default admin:", e.message);
    }
}

// Validation Helpers
function validateUsername(username) {
    if (!username || typeof username !== "string") {
        return "Username is required.";
    }
    const trimmed = username.trim();
    if (/\s/.test(trimmed)) {
        return "Username must not contain any spaces.";
    }
    if (trimmed.length < 3 || trimmed.length > 30) {
        return "Username must be between 3 and 30 characters.";
    }
    if (!/^[a-zA-Z0-9_.-]+$/.test(trimmed)) {
        return "Username can only contain letters, numbers, hyphens, dots, and underscores.";
    }
    return null;
}

function validateEmail(email) {
    if (!email || typeof email !== "string") {
        return "Email is required.";
    }
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email.trim())) {
        return "Please enter a valid email address with an '@' symbol and a valid domain.";
    }
    return null;
}

function validatePassword(password) {
    if (!password || typeof password !== "string") {
        return "Password is required.";
    }
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>_\-+=[\]\\/`~]/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
        const missing = [];
        if (!hasUpperCase) missing.push("an uppercase letter");
        if (!hasLowerCase) missing.push("a lowercase letter");
        if (!hasNumber) missing.push("a number");
        if (!hasSpecialChar) missing.push("a special character (!@#$%^&* etc.)");

        return `Password is not valid. It must contain ${missing.join(", ")}.`;
    }
    if (password.length < 8) {
        return "Password must be at least 8 characters long.";
    }
    return null;
}

async function handleUserSignup(req, res) {
    try {
        const { username, name, email, password } = req.body;

        // 1. Username validation
        const usernameError = validateUsername(username);
        if (usernameError) {
            return res.render("auth", { error: usernameError });
        }

        // 2. Email validation
        const emailError = validateEmail(email);
        if (emailError) {
            return res.render("auth", { error: emailError });
        }

        // 3. Password validation
        const passwordError = validatePassword(password);
        if (passwordError) {
            return res.render("auth", { error: passwordError });
        }

        const normalizedUsername = username.trim().toLowerCase();
        const normalizedEmail = email.trim().toLowerCase();

        // Check if username already taken
        const existingUsername = await User.findOne({ username: normalizedUsername });
        if (existingUsername) {
            return res.render("auth", { error: `The username '${username}' is already taken. Please choose another username.` });
        }

        // Check if email already taken
        const existingEmail = await User.findOne({ email: normalizedEmail });
        if (existingEmail) {
            return res.render("auth", { error: "An account with this email already exists. Please sign in." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await User.create({
            username: normalizedUsername,
            name: (name && name.trim()) ? name.trim() : username.trim(),
            email: normalizedEmail,
            password: hashedPassword,
            role: "NORMAL"
        });

        const token = setUser(newUser);
        res.cookie("token", token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
        return res.redirect("/");
    } catch (error) {
        console.error("Signup error:", error);
        return res.render("auth", { error: "Failed to create account. Please try again." });
    }
}

async function handleUserLogin(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.render("auth", { error: "Please enter your username/email and password" });
        }

        const trimmedIdentifier = email.trim();

        // 1. Check Master Admin Credentials
        if (
            trimmedIdentifier.toLowerCase() === ADMIN_USERNAME.toLowerCase() ||
            trimmedIdentifier.toLowerCase() === "aayush27" ||
            trimmedIdentifier.toLowerCase() === ADMIN_EMAIL.toLowerCase()
        ) {
            if (password === ADMIN_PASSWORD) {
                let admin = await User.findOne({ role: "ADMIN" });
                if (!admin) {
                    admin = await ensureAdminExists();
                }
                const token = setUser(admin);
                res.cookie("token", token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
                return res.redirect("/");
            } else {
                return res.render("auth", { error: "Invalid Admin password" });
            }
        }

        // 2. Standard User Lookup (Allow Login by either Email OR Username)
        const user = await User.findOne({
            $or: [
                { email: trimmedIdentifier.toLowerCase() },
                { username: trimmedIdentifier.toLowerCase() }
            ]
        });

        if (!user) {
            return res.render("auth", { error: "No account found with this email or username." });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.render("auth", { error: "Invalid password" });
        }

        const token = setUser(user);
        res.cookie("token", token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
        return res.redirect("/");
    } catch (error) {
        console.error("Login error:", error);
        return res.render("auth", { error: "An error occurred during sign in." });
    }
}

async function handleUserLogout(req, res) {
    res.clearCookie("token");
    return res.redirect("/login");
}

module.exports = {
    handleUserSignup,
    handleUserLogin,
    handleUserLogout,
    ensureAdminExists
};
