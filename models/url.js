
const mongoose = require('mongoose');

const urlSchema = new mongoose.Schema({
    shortId: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        maxlength: 50,
        match: /^[a-zA-Z0-9_-]+$/,
    },

    redirectURL: {
    type: String,
    required: true,
    trim: true,
    validate: {
        validator: function (value) {
            try {
                const parsedURL = new globalThis.URL(value);
                return ["http:", "https:"].includes(parsedURL.protocol);
            } catch (error) {
                return false;
            }
        },
        message: "Only valid HTTP and HTTPS URLs are allowed."
    }
  },

    visitHistory: [
        {
            timestamp: {
                type: Number
            },

            userAgent: {
                type: String,
                default: "Unknown"
            },

            device: {
                type: String,
                default: "Unknown"
            },

            browser:{
                type: String,
                default:"Unknown"
            },

            referrer:{
                type:String,
                default:"Direct"
            },

            country:{
                type: String,
                default: "Unknown"
            }

        }
    ],

    // Link expiration
    expiresAt: {
        type: Date,
        default: null,
    },

    isActive: {
        type:Boolean,
        default: true,
    },

},
{ timestamps: true });

const URL = mongoose.model('url', urlSchema);

module.exports = URL;
