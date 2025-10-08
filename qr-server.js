const express = require('express');
const app = express();
const port = 3000;

// Store the latest QR code
let currentQR = null;

app.get('/qr', (req, res) => {
  const qrData = req.query.data;
  if (qrData) {
    currentQR = qrData;
  }

  if (!currentQR) {
    res.send(`
      <html>
        <head>
          <title>WhatsApp QR Code</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .container { max-width: 400px; margin: 0 auto; }
            .qr-placeholder { border: 2px dashed #ccc; padding: 20px; margin: 20px 0; }
            h1 { color: #25D366; }
            p { color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>📱 Link WhatsApp Device</h1>
            <p>Scan the QR code below with WhatsApp Web to link your device.</p>
            <div class="qr-placeholder">
              <p>QR Code will appear here when generated...</p>
              <p>Refresh this page if needed.</p>
            </div>
          </div>
        </body>
      </html>
    `);
    return;
  }

  res.send(`
    <html>
      <head>
        <title>WhatsApp QR Code</title>
        <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 20px; background: #f5f5f5; }
          .container { max-width: 400px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          h1 { color: #25D366; margin-bottom: 10px; }
          p { color: #666; margin-bottom: 20px; }
          #qrcode { margin: 20px auto; }
          .status { margin-top: 20px; padding: 10px; border-radius: 5px; }
          .waiting { background: #fff3cd; color: #856404; }
          .success { background: #d1edff; color: #0c63e4; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>📱 Link WhatsApp Device</h1>
          <p>Scan the QR code below with WhatsApp Web to link your device.</p>
          <div id="qrcode"></div>
          <div id="status" class="status waiting">
            Waiting for WhatsApp connection...
          </div>
        </div>

        <script>
          // Generate QR code
          const qrData = "${currentQR.replace(/"/g, '\\"')}";
          QRCode.toCanvas(document.getElementById('qrcode'), qrData, {
            width: 256,
            height: 256,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            }
          }, function (error) {
            if (error) console.error(error);
          });

          // Check connection status every 5 seconds
          setInterval(() => {
            fetch('${process.env.BACKEND_URL || 'http://localhost:8000'}/health')
              .then(response => {
                if (response.ok) {
                  document.getElementById('status').className = 'status success';
                  document.getElementById('status').innerHTML = '✅ Device linked successfully! You can close this window.';
                }
              })
              .catch(() => {
                // Still waiting
              });
          }, 5000);
        </script>
      </body>
    </html>
  `);
});

// Root route - redirect to /qr
app.get('/', (req, res) => {
  res.redirect('/qr');
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// API endpoint to update QR code
app.post('/update-qr', express.json(), (req, res) => {
  console.log('Received QR update request:', req.body);
  if (req.body.qr) {
    currentQR = req.body.qr;
    console.log('QR code updated successfully');
    res.json({ success: true });
  } else {
    console.log('No QR data provided');
    res.status(400).json({ error: 'No QR data provided' });
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`🔗 QR Code server running at http://0.0.0.0:${port}`);
  console.log(`📱 Visit http://10.84.19.232:${port}/qr to see the WhatsApp QR code`);
});
