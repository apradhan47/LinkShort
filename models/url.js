
const mongoose = require('mongoose');

const urlSchema = new mongoose.Schema({
    shortId: {
        type: String,
        required: true,
        unique: true,
    },

    redirectURL: {
        type: String,
        required: true,
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
