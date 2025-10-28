(async () => {
  try {
    const res = await fetch('http://localhost:5000/api/user/book-availability-debug', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ docId: '68ed423a3585f3aa3b3e3136', slotDate: '28_10_2025', slotTime: '04:30 pm' })
    })
    console.log('STATUS', res.status)
    const text = await res.text()
    console.log(text)
  } catch (err) {
    console.error('ERR', err)
  }
})()
