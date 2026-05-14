const QRCode = require('qrcode');
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');

async function generateMasterQR() {
    const os = require('os');
    function getLocalIp() {
        const interfaces = os.networkInterfaces();
        for (const name of Object.keys(interfaces)) {
            for (const iface of interfaces[name]) {
                if (iface.family === 'IPv4' && !iface.internal) {
                    return iface.address;
                }
            }
        }
        return '127.0.0.1';
    }
    const currentIp = getLocalIp();
    const username = 'AnDeWeen'; 
    const url = `https://${username}.github.io/EquiLib-Portal/`;
    
    // We create a large canvas for a high quality QR code
    const size = 1000;
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    console.log(`Generating QR Code pointing to: ${url}`);

    try {
        // Generate QR Code with High (H) error correction
        // High error correction allows up to 30% of the QR code to be covered/damaged
        await QRCode.toCanvas(canvas, url, {
            errorCorrectionLevel: 'H',
            margin: 2,
            width: size,
            color: {
                dark: '#000000',  // Black dots
                light: '#ffffff' // White background
            }
        });

        try {
            // Load the soot.jpg overlay image
            const img = await loadImage('soot.jpg');
            
            // Calculate size and position for the central image overlay
            // We'll use 25% of the total size to stay safely within the 30% error correction limit
            const logoSize = size * 0.25; 
            const x = (size - logoSize) / 2;
            const y = (size - logoSize) / 2;

            // Draw a white background square behind the logo for contrast/cleanliness
            const border = 10;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(x - border, y - border, logoSize + (border * 2), logoSize + (border * 2));

            // Draw the overlay image in the center
            ctx.drawImage(img, x, y, logoSize, logoSize);
            console.log("Successfully overlaid soot.jpg in the center.");
        } catch (err) {
            console.error("\n⚠️ WARNING: Could not find or load 'soot.jpg'.");
            console.error("The QR code was generated WITHOUT the central image.");
            console.error("Please place 'soot.jpg' in the same folder and run the script again to add it.\n");
        }

        // Save the final image to a file
        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync('master_qr.png', buffer);
        console.log("✅ Success! Master QR Code saved as 'master_qr.png'.");

    } catch (error) {
        console.error("Error generating QR code:", error);
    }
}

generateMasterQR();
