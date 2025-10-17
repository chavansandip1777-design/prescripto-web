import fetch from 'node-fetch'

const url = (path) => `http://localhost:5000${path}`

const run = async () => {
    try {
        console.log('POST /api/admin/login')
        const loginRes = await fetch(url('/api/admin/login'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@gmail.com', password: '12345' }) })
        const login = await loginRes.text()
        console.log('status', loginRes.status)
        console.log(login)
        if (loginRes.status !== 200) return process.exit(1)
        const token = JSON.parse(login).token

        console.log('GET /api/admin/all-doctors')
        const docsRes = await fetch(url('/api/admin/all-doctors'), { headers: { aToken: token } })
        console.log('status', docsRes.status)
        const docsText = await docsRes.text()
        console.log(docsText.substring(0, 1000))
        const doctors = JSON.parse(docsText).doctors
        if (!doctors || !doctors.length) return console.log('no doctors')
        const docId = doctors[0]._id

        // create availability for tomorrow
        const start = new Date(); start.setDate(start.getDate() + 1); const end = new Date(start)
        const payload = { docId, startDate: start.toISOString(), endDate: end.toISOString(), totalSlots: 4, slotDurationMinutes: 30, startHour: 9, endHour: 17 }
        console.log('POST /api/admin/create-availability', JSON.stringify(payload))
        const createRes = await fetch(url('/api/admin/create-availability'), { method: 'POST', headers: { 'Content-Type': 'application/json', aToken: token }, body: JSON.stringify(payload) })
        console.log('status', createRes.status)
        console.log(await createRes.text())

        console.log('POST /api/doctor/availability')
        const availRes = await fetch(url('/api/doctor/availability'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ docId }) })
        console.log('status', availRes.status)
        const availText = await availRes.text()
        console.log(availText.substring(0, 1000))
        const avail = JSON.parse(availText)
        if (!avail.success || !avail.availability || !avail.availability.length) return console.log('no availability to book')
        const firstDay = avail.availability[0]
        const firstSlot = firstDay.slots && firstDay.slots[0]
        if (!firstSlot) return console.log('no slot')

        // book guest
        const bookingPayload = { docId, slotDate: firstDay.date, slotTime: firstSlot.time, patientName: 'Test Patient', patientMobile: '9999999999' }
        console.log('POST /api/user/book-appointment-guest', bookingPayload)
        const bookRes = await fetch(url('/api/user/book-appointment-guest'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bookingPayload) })
        console.log('status', bookRes.status)
        console.log(await bookRes.text())

        console.log('GET /api/admin/get-doctor/' + docId)
        const docRec = await fetch(url('/api/admin/get-doctor/' + docId), { headers: { aToken: token } })
        console.log('status', docRec.status)
        console.log(await docRec.text())

    } catch (err) {
        console.error('E2E failed', err)
        process.exit(1)
    }
}

run()
