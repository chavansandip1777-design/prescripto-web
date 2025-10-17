const http = require('http');
const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/admin/all-doctors',
    method: 'GET'
};

const req = http.request(options, res => {
    console.log(`statusCode: ${res.statusCode}`);
    res.on('data', d => process.stdout.write(d));
});

req.on('error', error => {
    console.error('request error:', error.message);
});

req.end();
