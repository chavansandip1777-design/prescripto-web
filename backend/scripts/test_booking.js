(async () => {
  const url = 'http://localhost:5000/api/user/book-appointment-guest'
  const body = {
    docId: '68ed423a3585f3aa3b3e3136',
    slotDate: '28_10_2025',
    slotTime: '04:30 pm',
    patientName: 'Test User',
    patientMobile: '9999999999'
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    console.log('HTTP_STATUS', res.status)
    console.log(JSON.stringify(data, null, 2))
  } catch (err) {
    console.error('ERROR', err)
    process.exit(1)
  }
})()
