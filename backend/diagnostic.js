;(async ()=>{
  try{
    const fetch = (await import('node-fetch')).default
    const base = 'http://localhost:5000'
    const loginRes = await fetch(base + '/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@gmail.com', password: '12345' }) })
    const login = await loginRes.json()
    if (!login.token) { console.error('Admin login failed', JSON.stringify(login)); process.exit(1) }
    const docsRes = await fetch(base + '/api/admin/all-doctors', { headers: { aToken: login.token } })
    const docs = await docsRes.json()
    if (!docs.doctors || !docs.doctors.length) { console.error('No doctors'); process.exit(1) }
    const doc = docs.doctors[0]
    console.log('\n=== DOCTOR INFO ===')
    console.log(JSON.stringify({ _id: doc._id, name: doc.name, image: doc.image }, null, 2))
    console.log('\n=== SLOTS_BOOKED ===')
    console.log(JSON.stringify(doc.slots_booked || {}, null, 2))
    const availRes = await fetch(base + '/api/doctor/availability', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ docId: doc._id }) })
    const avail = await availRes.json()
    console.log('\n=== AVAILABILITY RESPONSE ===')
    console.log(JSON.stringify(avail, null, 2))
    const apRes = await fetch(base + '/api/admin/appointments', { headers: { aToken: login.token } })
    const appointmentsRes = await apRes.json()
    const appointments = appointmentsRes.appointments || []
    console.log('\n=== TOTAL APPOINTMENTS (admin) ===', appointments.length)
    const apptsForDoc = appointments.filter(a => a.docId === doc._id && !a.cancelled)
    console.log('=== APPOINTMENTS FOR DOC ===', apptsForDoc.length)
    const bySlot = {}
    apptsForDoc.forEach(a => {
      const k = `${a.slotDate||''}|${a.slotTime||''}`
      bySlot[k] = (bySlot[k] || 0) + 1
    })
    console.log('\n=== APPOINTMENTS BY SLOT ===')
    console.log(JSON.stringify(bySlot, null, 2))
  }catch(e){ console.error('ERR', e) }
})()
