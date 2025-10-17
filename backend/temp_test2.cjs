const axios = require('./node_modules/axios');
(async () => {
    try {
        const r = await axios.post('http://localhost:5000/api/admin/login', { email: 'admin@gmail.com', password: '12345' });
        console.log('login', r.data);
        if (r.data.success) {
            const t = r.data.token;
            const d = await axios.get('http://localhost:5000/api/admin/all-doctors', { headers: { aToken: t } });
            console.log('doctors', JSON.stringify(d.data, null, 2));
        }
    } catch (e) {
        console.error('err', e.toString());
        if (e.response) console.error('status', e.response.status, 'data', e.response.data);
    }
})();
