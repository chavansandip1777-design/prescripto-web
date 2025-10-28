(async () => {
  const docId = '68ed423a3585f3aa3b3e3136'
  const slotDateKey = '28_10_2025'
  const targetTime = '04:30 pm'
  try {
    // Fetch doctor list and find doctor
    const listRes = await fetch('http://localhost:5000/api/doctor/list')
    const listData = await listRes.json()
    console.log('DOCTOR_LIST_STATUS', listRes.status)
    const doctor = Array.isArray(listData) ? listData.find(d => d._id === docId) : (listData.doctors || []).find(d => d._id === docId)
    if (!doctor) {
      console.log('Doctor not found in /api/doctor/list response; full response:')
      console.log(JSON.stringify(listData, null, 2))
    } else {
      console.log('Doctor found. slots_booked for date:', slotDateKey)
      console.log(JSON.stringify(doctor.slots_booked && doctor.slots_booked[slotDateKey], null, 2))
    }

    // Fetch availability
    const availRes = await fetch('http://localhost:5000/api/doctor/availability', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ docId })
    })
    const availData = await availRes.json()
    console.log('AVAIL_STATUS', availRes.status)
    // API returns { success:true, availability: [...] } or similar
    console.log(JSON.stringify(availData, null, 2))

    // If availability array present, find target day
    const availabilityArr = availData && (availData.availability || availData.data || availData)
    if (Array.isArray(availabilityArr)) {
      const day = availabilityArr.find(d => d.date === slotDateKey)
      if (!day) {
        console.log('No availability for', slotDateKey)
        return
      }
      console.log('Found availability for', slotDateKey)
      console.log('Slots array (last few):', JSON.stringify(day.slots.slice(-5), null, 2))

      // Reconstruct seatsAllocatedForSlot using same logic as server
      const slotDuration = day.slotDurationMinutes
      const startHour = day.startHour
      const endHour = day.endHour
      const totalSeats = Number(day.totalSlots) || 0
      const dateParts = slotDateKey.split('_').map(Number)
      const dateObj = new Date(dateParts[2], dateParts[1] - 1, dateParts[0])
      const cursor = new Date(dateObj)
      cursor.setHours(startHour, 0, 0, 0)
      const endTime = new Date(dateObj)
      endTime.setHours(endHour, 0, 0, 0)
      const slotsTimes = []
      while (cursor < endTime) {
        slotsTimes.push(new Date(cursor))
        cursor.setTime(cursor.getTime() + slotDuration * 60 * 1000)
      }
      const S = slotsTimes.length
      const base = S > 0 ? Math.floor(totalSeats / S) : 0
      const remainder = S > 0 ? totalSeats % S : 0
      const formatTime = (dt) => new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).format(dt).toLowerCase()
      const formattedTimes = slotsTimes.map(t => formatTime(t))
      console.log('Formatted times sample:', formattedTimes.slice(-5))
      const normalizedTarget = targetTime && typeof targetTime === 'string' ? targetTime.toLowerCase() : targetTime
      const idx = formattedTimes.findIndex(t => t === normalizedTarget)
      console.log('Index of target time in formattedTimes:', idx)
      const seatsAllocatedForSlot = base + (idx < remainder ? 1 : 0)
      console.log('Seats allocated for slot', targetTime, '=', seatsAllocatedForSlot)
    }

  } catch (err) {
    console.error('ERROR', err)
    process.exit(1)
  }
})()
