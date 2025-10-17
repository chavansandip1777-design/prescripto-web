const http = require('http');

function postJson(path, data) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify(data);
        const options = {
            hostname: 'localhost',
            port: 5000,
            path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        };
        const req = http.request(options, res => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body }));
        });
        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

function getJson(path, token) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 5000,
            path,
            method: 'GET',
            headers: token ? { 'aToken': token } : {}
        };
        const req = http.request(options, res => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body }));
        });
        req.on('error', reject);
        req.end();
    });
}

(async () => {
    try {
        const login = await postJson('/api/admin/login', { email: 'admin@gmail.com', password: '12345' });
        console.log('login status', login.status);
        console.log(login.body);
        const parsed = JSON.parse(login.body || '{}');
        if (!parsed.success) return;
        const token = parsed.token;
        const docs = await getJson('/api/admin/all-doctors', token);
        console.log('docs status', docs.status);
        console.log(docs.body);
    } catch (err) {
        console.error('err', err.message);
    }
})();
