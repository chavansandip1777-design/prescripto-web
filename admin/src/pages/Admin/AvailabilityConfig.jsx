import React, { useContext, useEffect, useState } from 'react'
import { AdminContext } from '../../context/AdminContext'
import axios from 'axios'

const AvailabilityConfig = () => {
  const { doctors, getAllDoctors, aToken } = useContext(AdminContext)
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'

  const [selectedDoc, setSelectedDoc] = useState('')
  const [date, setDate] = useState('')
  const [totalSeats, setTotalSeats] = useState(4)
  const [slotDuration, setSlotDuration] = useState(30)
  const [enabledDays, setEnabledDays] = useState(3)
  const [startHour, setStartHour] = useState(9)
  const [startMinute, setStartMinute] = useState(0)
  const [endHour, setEndHour] = useState(17)
  const [endMinute, setEndMinute] = useState(0)

  useEffect(() => {
    if (aToken) getAllDoctors()
  }, [aToken])

  const saveAvailability = async () => {
    if (!selectedDoc || !date) return alert('Select doctor and date')
    // compute ISO startDate/endDate based on selected date and enabledDays
    const startDateObj = new Date(date)
    const endDateObj = new Date(startDateObj.getTime() + (enabledDays - 1) * 24 * 60 * 60 * 1000)
    // compute integer hours for start and end (we'll send hours as decimal with minutes as fraction)
    const startHourDecimal = Number(startHour) + Number(startMinute) / 60
    const endHourDecimal = Number(endHour) + Number(endMinute) / 60
    const payload = {
      docId: selectedDoc,
      startDate: startDateObj.toISOString(),
      endDate: endDateObj.toISOString(),
      totalSlots: totalSeats,
      slotDurationMinutes: slotDuration,
      startHour: startHourDecimal,
      endHour: endHourDecimal
    }

    try {
      const { data } = await axios.post(backendUrl + '/api/admin/create-availability', payload, { headers: { aToken } })
      if (data.success) {
        alert('Availability created')
      } else {
        alert('Failed: ' + data.message)
      }
    } catch (err) {
      console.log(err)
      alert('Failed to save availability: ' + (err.response?.data?.message || err.message))
    }
  }

  return (
    <div className='p-6'>
      <h2 className='text-xl font-semibold mb-4'>Doctor Availability / Event Configuration</h2>

      <div className='max-w-xl bg-white p-4 rounded border'>
        <label className='block mb-2'>Doctor</label>
        <select className='border p-2 rounded w-full mb-3' value={selectedDoc} onChange={(e) => setSelectedDoc(e.target.value)}>
          <option value=''>Select doctor</option>
          {doctors.map(d => <option key={d._id} value={d._id}>{d.name} - {d.speciality}</option>)}
        </select>

        <label className='block mb-2'>Start date</label>
        <input type='date' className='border p-2 rounded w-full mb-3' value={date} onChange={(e) => setDate(e.target.value)} />

        <label className='block mb-2'>Total seats for the day</label>
        <input type='number' min={1} className='border p-2 rounded w-full mb-3' value={totalSeats} onChange={(e) => setTotalSeats(Number(e.target.value))} />

        <label className='block mb-2'>Slot duration (minutes)</label>
        <select className='border p-2 rounded w-full mb-3' value={slotDuration} onChange={(e) => setSlotDuration(Number(e.target.value))}>
          <option value={15}>15</option>
          <option value={30}>30</option>
          <option value={45}>45</option>
          <option value={60}>60</option>
        </select>

        <div className='grid grid-cols-2 gap-2 mb-3'>
          <div>
            <label className='block mb-1'>Start time</label>
            <div className='flex gap-2'>
              <select className='border p-2 rounded w-1/2' value={startHour} onChange={(e) => setStartHour(e.target.value)}>
                {Array.from({length:24}).map((_,i)=> <option key={i} value={i}>{i}</option>)}
              </select>
              <select className='border p-2 rounded w-1/2' value={startMinute} onChange={(e) => setStartMinute(e.target.value)}>
                <option value={0}>00</option>
                <option value={15}>15</option>
                <option value={30}>30</option>
                <option value={45}>45</option>
              </select>
            </div>
          </div>

          <div>
            <label className='block mb-1'>End time</label>
            <div className='flex gap-2'>
              <select className='border p-2 rounded w-1/2' value={endHour} onChange={(e) => setEndHour(e.target.value)}>
                {Array.from({length:24}).map((_,i)=> <option key={i} value={i}>{i}</option>)}
              </select>
              <select className='border p-2 rounded w-1/2' value={endMinute} onChange={(e) => setEndMinute(e.target.value)}>
                <option value={0}>00</option>
                <option value={15}>15</option>
                <option value={30}>30</option>
                <option value={45}>45</option>
              </select>
            </div>
          </div>
        </div>

        <label className='block mb-2'>Enable next days (including selected day)</label>
        <input type='number' min={1} max={7} className='border p-2 rounded w-full mb-3' value={enabledDays} onChange={(e) => setEnabledDays(Number(e.target.value))} />

        <button onClick={saveAvailability} className='bg-primary text-white px-4 py-2 rounded'>Save Availability</button>
      </div>
    </div>
  )
}

export default AvailabilityConfig
