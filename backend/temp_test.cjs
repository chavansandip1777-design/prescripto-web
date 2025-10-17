const axios = require('axios');
(async () => {
    try {
        const loginRes = await axios.post('http://localhost:5000/api/admin/login', { email: 'admin@gmail.com', password: '12345' });
        console.log('loginRes:', loginRes.data);
        if (!loginRes.data || !loginRes.data.success) return;
        const token = loginRes.data.token;
        const docsRes = await axios.get('http://localhost:5000/api/admin/all-doctors', { headers: { aToken: token } });
        console.log('doctors:', JSON.stringify(docsRes.data, null, 2));
    } catch (err) {
        console.error('error:', err.message);
        if (err.response) console.error('status', err.response.status, 'data', err.response.data);
    }
})();
