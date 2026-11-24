const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

function createPng(width, height) {
    // 32x32 RGBA
    const rawData = Buffer.alloc(height * (1 + width * 4));
    
    // Gradient: indigo (#4f46e5: 79, 70, 229) to purple (#9333ea: 147, 51, 234)
    for (let y = 0; y < height; y++) {
        const rowOffset = y * (1 + width * 4);
        rawData[rowOffset] = 0; // Filter type: None
        
        for (let x = 0; x < width; x++) {
            const pixelOffset = rowOffset + 1 + x * 4;
            
            // Check rounded squircle boundary
            const dx = Math.abs(x - 15.5);
            const dy = Math.abs(y - 15.5);
            const dist = Math.pow(dx, 3) + Math.pow(dy, 3);
            
            if (dist < 2200) {
                // Background dark slate
                let r = 15, g = 23, b = 42, a = 255;
                
                // Link design coordinates (center diagonal chain)
                const isDiag = Math.abs((x + y) - 31) <= 2 && x >= 11 && x <= 20 && y >= 11 && y <= 20;
                const isLoop1 = (Math.pow(x - 11, 2) + Math.pow(y - 20, 2) <= 36) && (Math.pow(x - 11, 2) + Math.pow(y - 20, 2) >= 9);
                const isLoop2 = (Math.pow(x - 20, 2) + Math.pow(y - 11, 2) <= 36) && (Math.pow(x - 20, 2) + Math.pow(y - 11, 2) >= 9);
                
                if (isDiag || isLoop1 || isLoop2) {
                    const t = (x + y) / 62;
                    r = Math.round(79 + t * (147 - 79));
                    g = Math.round(70 + t * (197 - 70));
                    b = Math.round(229 + t * (253 - 229));
                }
                
                rawData[pixelOffset] = r;
                rawData[pixelOffset + 1] = g;
                rawData[pixelOffset + 2] = b;
                rawData[pixelOffset + 3] = a;
            } else {
                // Transparent
                rawData[pixelOffset] = 0;
                rawData[pixelOffset + 1] = 0;
                rawData[pixelOffset + 2] = 0;
                rawData[pixelOffset + 3] = 0;
            }
        }
    }
    
    const compressed = zlib.deflateSync(rawData);
    
    function makeChunk(type, data) {
        const len = Buffer.alloc(4);
        len.writeUInt32BE(data.length, 0);
        const typeAndData = Buffer.concat([Buffer.from(type), data]);
        const crc = Buffer.alloc(4);
        crc.writeInt32BE(calculateCrc(typeAndData), 0);
        return Buffer.concat([len, typeAndData, crc]);
    }
    
    function calculateCrc(buf) {
        let c = 0xffffffff;
        for (let n = 0; n < buf.length; n++) {
            c ^= buf[n];
            for (let k = 0; k < 8; k++) {
                c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
            }
        }
        return c ^ 0xffffffff;
    }
    
    const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8; // bit depth
    ihdr[9] = 6; // color type RGBA
    ihdr[10] = 0; // compression
    ihdr[11] = 0; // filter
    ihdr[12] = 0; // interlace
    
    return Buffer.concat([
        signature,
        makeChunk('IHDR', ihdr),
        makeChunk('IDAT', compressed),
        makeChunk('IEND', Buffer.alloc(0))
    ]);
}

const pngBuffer = createPng(32, 32);
const publicDir = path.join(__dirname, '..', 'public');
fs.writeFileSync(path.join(publicDir, 'favicon.png'), pngBuffer);

// Also wrap PNG into standard ICO format
const icoHeader = Buffer.alloc(6);
icoHeader.writeUInt16LE(0, 0); // reserved
icoHeader.writeUInt16LE(1, 2); // icon type
icoHeader.writeUInt16LE(1, 4); // count: 1 image

const icoDirEntry = Buffer.alloc(16);
icoDirEntry.writeUInt8(32, 0); // width
icoDirEntry.writeUInt8(32, 1); // height
icoDirEntry.writeUInt8(0, 2);  // colors
icoDirEntry.writeUInt8(0, 3);  // reserved
icoDirEntry.writeUInt16LE(1, 4); // color planes
icoDirEntry.writeUInt16LE(32, 6); // bpp
icoDirEntry.writeUInt32LE(pngBuffer.length, 8); // size
icoDirEntry.writeUInt32LE(22, 12); // offset: 6 + 16 = 22

const icoBuffer = Buffer.concat([icoHeader, icoDirEntry, pngBuffer]);
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);
console.log('Successfully created favicon.png and favicon.ico in public directory!');
