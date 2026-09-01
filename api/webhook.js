const axios = require('axios');

// Konfigurasi API target
const BASE_URL = 'https://am.yappi.my.id';
const COOKIE_API = `${BASE_URL}/api/cookie`;
const SEND_API = `${BASE_URL}/api/send`;
const VERIFY_API = `${BASE_URL}/api/verify`;

// Fungsi untuk mendapatkan session cookie
async function getSessionCookie() {
    try {
        const res = await axios.get(COOKIE_API, {
            timeout: 10000,
            headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36' }
        });
        if (res.data?.ok && res.data?.cookie) {
            return res.data.cookie;
        }
        throw new Error('Gagal mendapatkan session cookie');
    } catch (err) {
        throw new Error(`Cookie API Error: ${err.message}`);
    }
}

// Fungsi mengirim link verifikasi
async function sendVerificationLink(email, cookie) {
    try {
        const res = await axios.post(SEND_API, {
            email: email,
            cookie: cookie
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Origin': BASE_URL,
                'Referer': `${BASE_URL}/`,
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36'
            },
            timeout: 30000
        });
        if (res.data?.ok) {
            return true;
        }
        throw new Error(res.data?.error || 'Gagal mengirim link');
    } catch (err) {
        throw new Error(err.response?.data?.error || err.message);
    }
}

// Fungsi verifikasi magic link
async function verifyMagicLink(email, link, cookie) {
    try {
        const res = await axios.post(VERIFY_API, {
            email: email,
            link: link,
            cookie: cookie
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Origin': BASE_URL,
                'Referer': `${BASE_URL}/`,
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36'
            },
            timeout: 30000
        });
        if (res.data?.ok) {
            return {
                success: true,
                userData: res.data.data?.user || null
            };
        }
        throw new Error(res.data?.error || 'Verifikasi gagal');
    } catch (err) {
        throw new Error(err.response?.data?.error || err.message);
    }
}

// ========== HANDLER UTAMA ==========
module.exports = async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Parse URL
    const url = req.url || '';

    // ====== API: /api/initiate ======
    if (url.startsWith('/api/initiate') && req.method === 'POST') {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: 'Email required' });
        }

        try {
            console.log(`[+] Initiating for ${email}`);
            const cookie = await getSessionCookie();
            await sendVerificationLink(email, cookie);
            res.json({
                success: true,
                message: `Link verifikasi telah dikirim ke ${email}`,
                cookie: cookie
            });
        } catch (error) {
            console.error(`[-] Error: ${error.message}`);
            res.status(500).json({ success: false, message: error.message });
        }
        return;
    }

    // ====== API: /api/verify ======
    if (url.startsWith('/api/verify') && req.method === 'POST') {
        const { email, link, cookie } = req.body;
        if (!email || !link) {
            return res.status(400).json({ success: false, message: 'Email and magic link required' });
        }

        try {
            console.log(`[+] Verifying for ${email}`);
            const result = await verifyMagicLink(email, link, cookie || '');
            res.json({
                success: true,
                message: 'Verifikasi berhasil! Akun premium aktif.',
                data: result.userData
            });
        } catch (error) {
            console.error(`[-] Error: ${error.message}`);
            res.status(500).json({ success: false, message: error.message });
        }
        return;
    }

    // ====== Default: 404 ======
    res.status(404).json({ error: 'Not Found' });
};