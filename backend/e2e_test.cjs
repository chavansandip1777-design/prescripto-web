const http = require('http');
function req(options, payload) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, res => {
            let body = '';
            res.on('data', c => body += c);
            res.on('end', () => resolve({ status: res.statusCode, body }));
        });
        req.on('error', reject);
        if (payload) req.write(JSON.stringify(payload));
        req.end();
    });
}
(async () => {
    try {
        // login
        const login = await req({ hostname: 'localhost', port: 5000, path: '/api/admin/login', method: 'POST', headers: { 'Content-Type': 'application/json' } }, { email: 'admin@gmail.com', password: '12345' });
        console.log('login', login.status, login.body);
        const token = JSON.parse(login.body).token;
        // fetch doctors
        const docs = await req({ hostname: 'localhost', port: 5000, path: '/api/admin/all-doctors', method: 'GET', headers: { aToken: token } });
        console.log('doctors', docs.status, docs.body);
        const doctors = JSON.parse(docs.body).doctors;
        if (!doctors || !doctors.length) return console.log('no doctors');
        const docId = doctors[0]._id;
        // create availability for tomorrow
        const start = new Date(); start.setDate(start.getDate() + 1); start.setHours(0, 0, 0, 0);
        const end = new Date(start); // single day
        const payload = { docId, startDate: start.toISOString(), endDate: end.toISOString(), totalSlots: 4, slotDurationMinutes: 30, startHour: 9, endHour: 17 };
        const createAvail = await req({ hostname: 'localhost', port: 5000, path: '/api/admin/create-availability', method: 'POST', headers: { 'Content-Type': 'application/json', aToken: token } }, payload);
        console.log('createAvail', createAvail.status, createAvail.body);
        // fetch availability
        const avail = await req({ hostname: 'localhost', port: 5000, path: '/api/doctor/availability', method: 'POST', headers: { 'Content-Type': 'application/json' } }, { docId });
        console.log('availability', avail.status, avail.body.substring(0, 1000));
        // attempt booking of first available slot
        const availData = JSON.parse(avail.body);
        if (!availData.success || !availData.availability || !availData.availability.length) return console.log('no availability to book');
        const firstDay = availData.availability[0];
        const firstSlot = firstDay.slots && firstDay.slots[0];
        if (!firstSlot) return console.log('no slot');
        const bookingPayload = { docId, slotDate: firstDay.date, slotTime: firstSlot.time, name: 'Test Patient', email: 'test@example.com', phone: '9999999999', amount: 100 };
        const book = await req({ hostname: 'localhost', port: 5000, path: '/api/user/book-appointment-guest', method: 'POST', headers: { 'Content-Type': 'application/json' } }, bookingPayload);
        console.log('book', book.status, book.body);
        // re-fetch doctor record
        const docRec = await req({ hostname: 'localhost', port: 5000, path: `/api/admin/get-doctor/${docId}`, method: 'GET', headers: { aToken: token } });
        console.log('docRec', docRec.status, docRec.body);
    } catch (e) { console.error('err', e.message); }
})();
