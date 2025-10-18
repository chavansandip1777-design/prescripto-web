import React, { useContext, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AppContext } from '../context/AppContext'
import { assets } from '../assets/assets'
import RelatedDoctors from '../components/RelatedDoctors'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import axios from 'axios'
import { toast } from 'react-toastify'

const Appointment = () => {

    const { docId } = useParams()
    const { doctors, currencySymbol, backendUrl, token, getDoctosData } = useContext(AppContext)
    const daysOfWeek = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

    const [docInfo, setDocInfo] = useState(false)
    const [docSlots, setDocSlots] = useState([])
    const [availabilityMap, setAvailabilityMap] = useState({})
    const [rawDateMap, setRawDateMap] = useState({})
    const [dayMetaMap, setDayMetaMap] = useState({})
    const [activeDays, setActiveDays] = useState(3)
    const [selectedDateKey, setSelectedDateKey] = useState(null)
    const [slotIndex, setSlotIndex] = useState(0)
    const [slotTime, setSlotTime] = useState('')
    // always show slots with seats >= 1
    const [patientName, setPatientName] = useState('')
    const [patientMobile, setPatientMobile] = useState('')

    const navigate = useNavigate()

    const fetchDocInfo = async () => {
        const docInfo = doctors.find((doc) => doc._id === docId)
        setDocInfo(docInfo)
    }

    const getAvailableSolts = async () => {

        setDocSlots([])
        try {
            const { data } = await axios.post(backendUrl + '/api/doctor/availability', { docId })
                if (data.success) {
                // normalize backend date into D_M_YYYY keys so FullCalendar highlighting works
                const map = {}
                const rawMap = {}
                const slotsPerDay = []
                const meta = {}
                    data.availability.forEach(item => {
                    // backend may return date either as DD_MM_YYYY key or as an ISO string
                    let key = item.date
                    if (typeof key === 'string' && (key.includes('T') || key.includes('-'))) {
                        const d = new Date(key)
                        if (!isNaN(d)) key = `${d.getDate()}_${d.getMonth()+1}_${d.getFullYear()}`
                    }
                    // normalize slots: backend now returns totalSeats, bookedSeats and availableSeats per slot
                    const slots = item.slots.map(s => {
                        const available = typeof s.availableSeats !== 'undefined' ? s.availableSeats : (s.seats || 0)
                        const totalForSlot = typeof s.totalSeats !== 'undefined' ? s.totalSeats : (item.totalSeats || 0)
                        const bookedForSlot = typeof s.bookedSeats !== 'undefined' ? s.bookedSeats : Math.max(0, totalForSlot - available)
                        return ({ ...s, datetime: new Date(s.datetime), availableSeats: available, totalSeats: totalForSlot, bookedSeats: bookedForSlot })
                    })
                    map[key] = slots
                    rawMap[key] = item.date
                    meta[key] = { totalSeats: item.totalSeats || 0 }
                    slotsPerDay.push(slots)
                })
                setAvailabilityMap(map)
                setRawDateMap(rawMap)
                setDayMetaMap(meta)
                setDocSlots(slotsPerDay)
                setActiveDays(data.availability.length)
                // default select first available date (use normalized key)
                if (data.availability.length) {
                    // set normalized key for first availability entry
                    let firstKey = data.availability[0].date
                    if (typeof firstKey === 'string' && (firstKey.includes('T') || firstKey.includes('-'))) {
                        const d = new Date(firstKey)
                        if (!isNaN(d)) firstKey = `${d.getDate()}_${d.getMonth()+1}_${d.getFullYear()}`
                    }
                    // ensure the selected key actually exists in availabilityMap (fallback to matching by date)
                    if (map[firstKey]) setSelectedDateKey(firstKey)
                    else {
                        // try to find a matching key by comparing year/month/day
                        const match = Object.keys(map).find(k => {
                            const parts = k.split('_').map(Number)
                            if (parts.length !== 3) return false
                            const kd = new Date(parts[2], parts[1]-1, parts[0])
                            const fd = new Date(firstKey)
                            return kd.getFullYear() === fd.getFullYear() && kd.getMonth() === fd.getMonth() && kd.getDate() === fd.getDate()
                        })
                        if (match) setSelectedDateKey(match)
                        else setSelectedDateKey(firstKey)
                    }
                }
                return
            } else {
                console.log('No availability returned from backend', data.message)
            }
        } catch (error) {
            console.log('Failed to fetch availability', error)
        }

    }

    const bookAppointment = async () => {
            if (!slotTime) {
            toast.warning('Please select a time slot')
            return
        }

        if (!patientName || !patientMobile) {
            toast.warning('Please enter patient name and mobile number')
            return
        }

        if (!selectedDateKey) {
            toast.warning('Please select a day')
            return
        }

        // use backend's raw date string for the booking payload so backend increments the correct slots_booked key
        const slotDate = rawDateMap[selectedDateKey] || selectedDateKey

        // ensure slot still has stock (seats) before attempting booking
        try {
            const slots = availabilityMap[selectedDateKey] || []
            const found = slots.find(s => s.time === slotTime)
            const availableNow = found ? (found.availableSeats ?? found.seats ?? 0) : 0
            if (!found || availableNow < 1) {
                toast.error('Selected slot is no longer available')
                // refresh availability
                await getAvailableSolts()
                return
            }
        } catch (e) {
            // proceed, server will validate as well
        }

        try {
            const { data } = await axios.post(backendUrl + '/api/user/book-appointment-guest', { docId, slotDate, slotTime, patientName, patientMobile })

            if (data.success) {
                toast.success(data.message)
                // refresh availability so UI shows decremented seats
                await getAvailableSolts()
                getDoctosData()
                // redirect to confirmation page with minimal details
                navigate(`/booking-confirmation?docId=${docId}&slotDate=${slotDate}&slotTime=${slotTime}&name=${encodeURIComponent(patientName)}&phone=${patientMobile}`)
            } else {
                toast.error(data.message)
            }

        } catch (error) {
            console.log(error)
            // fallback: update demo availability in localStorage (find matching slot and reduce seat)
            try {
                const key = 'demo_availability_' + docId
                const entries = JSON.parse(localStorage.getItem(key) || '[]')
                if (entries.length) {
                    // find entry containing the slotDate
                    const [d, m, y] = slotDate.split('_')
                    const targetDateStr = new Date(Number(y), Number(m)-1, Number(d)).toISOString().slice(0,10)
                    // reduce seats in the generated slots stored in frontend state
                    const updatedSlots = [...docSlots]
                    if (updatedSlots[slotIndex] && updatedSlots[slotIndex][0]) {
                        // find matching time slot and decrement seats
                        for (let i=0;i<updatedSlots[slotIndex].length;i++){
                            if (updatedSlots[slotIndex][i].time === slotTime) {
                                updatedSlots[slotIndex][i].seats = Math.max(0, (updatedSlots[slotIndex][i].seats || 1) - 1)
                                break
                            }
                        }
                        setDocSlots(updatedSlots)
                    }
                    toast.success('Booked (demo mode)')
                    navigate(`/booking-confirmation?docId=${docId}&slotDate=${slotDate}&slotTime=${slotTime}&name=${encodeURIComponent(patientName)}&phone=${patientMobile}`)
                    return
                }
            } catch (e) {
                console.log('Failed demo booking', e)
            }
            toast.error(error.message || 'Failed to book appointment')
        }
    }

    useEffect(() => {
        if (doctors.length > 0) {
            fetchDocInfo()
        }
    }, [doctors, docId])

    // fetch availability once when docInfo becomes available; updates happen after booking
    useEffect(() => {
        if (docInfo) {
            getAvailableSolts()
        }
    }, [docInfo])

    return docInfo ? (
    <div className='appointment-root'>

            {/* ---------- Doctor Details ----------- */}
            <div className='flex flex-col sm:flex-row gap-4'>
                <div>
                    <img className='bg-primary w-full sm:max-w-72 rounded-lg' src={docInfo.image} alt="" onError={(e)=>{ e.target.onerror=null; e.target.src='data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><rect width="100%" height="100%" fill="%23E6F0FF"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%236B7280" font-size="20">Doctor</text></svg>' }} />
                </div>

                <div className='flex-1 border border-[#ADADAD] rounded-lg p-8 py-7 bg-white mx-2 sm:mx-0 mt-[-80px] sm:mt-0'>

                    {/* ----- Doc Info : name, degree, experience ----- */}

                    <p className='flex items-center gap-2 text-3xl font-medium text-gray-700'>{docInfo.name} <img className='w-5' src={assets.verified_icon} alt="" /></p>
                    <div className='flex items-center gap-2 mt-1 text-gray-600'>
                        <p>{docInfo.degree} - {docInfo.speciality}</p>
                        <button className='py-0.5 px-2 border text-xs rounded-full'>{docInfo.experience}</button>
                    </div>

                    {/* ----- Doc About ----- */}
                    <div>
                        <p className='flex items-center gap-1 text-sm font-medium text-[#262626] mt-3'>About <img className='w-3' src={assets.info_icon} alt="" /></p>
                        <p className='text-sm text-gray-600 max-w-[700px] mt-1'>{docInfo.about}</p>
                    </div>

                    <p className='text-gray-600 font-medium mt-4'>Appointment fee: <span className='text-gray-800'>{currencySymbol}{docInfo.fees}</span> </p>
                </div>
            </div>

            {/* Booking slots */}
                <div className='mt-8 font-medium text-[#565656] booking-section'>
                <p >Booking slots</p>
                <div className='flex flex-col sm:flex-row gap-6'>
                    <div className='w-full sm:w-2/5'>
                        <div className='bg-white rounded-lg p-3 shadow-sm'>
                            <FullCalendar
                                plugins={[ dayGridPlugin, interactionPlugin ]}
                                initialView='dayGridMonth'
                                height={420}
                                dateClick={(info) => {
                                    // use the Date object provided by FullCalendar to avoid timezone parsing issues
                                    const d = info.date
                                        const key = `${d.getDate()}_${d.getMonth()+1}_${d.getFullYear()}`
                                        if (availabilityMap[key]) {
                                            setSelectedDateKey(key)
                                        } else {
                                            // fallback 1: try to find a matching availability key by comparing Y/M/D from key parts
                                            let match = Object.keys(availabilityMap).find(k => {
                                                const parts = k.split('_').map(Number)
                                                if (parts.length !== 3) return false
                                                const kd = new Date(parts[2], parts[1]-1, parts[0])
                                                return kd.getFullYear() === d.getFullYear() && kd.getMonth() === d.getMonth() && kd.getDate() === d.getDate()
                                            })
                                            // fallback 2: try to match by slot datetime inside availabilityMap (robust to timezone shifts)
                                            if (!match) {
                                                match = Object.keys(availabilityMap).find(k => {
                                                    const slots = availabilityMap[k] || []
                                                    return slots.some(s => {
                                                        try {
                                                            const sd = new Date(s.datetime)
                                                            return sd.getFullYear() === d.getFullYear() && sd.getMonth() === d.getMonth() && sd.getDate() === d.getDate()
                                                        } catch (e) { return false }
                                                    })
                                                })
                                            }
                                            if (match) setSelectedDateKey(match)
                                            else setSelectedDateKey(null)
                                        }
                                }}
                                dayCellClassNames={(arg) => {
                                    const d = arg.date
                                    const key = `${d.getDate()}_${d.getMonth()+1}_${d.getFullYear()}`
                                    const classes = []
                                    if (availabilityMap[key]) classes.push('fc-available-day')
                                    // selected day highlight
                                    if (selectedDateKey) {
                                        const parts = selectedDateKey.split('_')
                                        const sd = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]))
                                        if (sd.getFullYear() === d.getFullYear() && sd.getMonth() === d.getMonth() && sd.getDate() === d.getDate()) classes.push('fc-selected-day')
                                    }
                                    return classes.join(' ')
                                }}
                            />
                        </div>
                    </div>
                    <div className='flex-1'>
                            <div className='mb-3 flex items-center justify-between'>
                            <div>
                                <div className='text-sm text-gray-500'>Available time slots</div>
                                {selectedDateKey ? (
                                    <div>
                                        <div className='text-lg font-semibold'>{(() => {
                                            const [d,m,y] = selectedDateKey.split('_')
                                            const dateObj = new Date(Number(y), Number(m)-1, Number(d))
                                            return dateObj.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
                                        })()}</div>
                                        <div className='text-sm text-gray-500'>
                                            {(() => {
                                                const meta = dayMetaMap[selectedDateKey] || { totalSeats: 0 }
                                                const total = meta.totalSeats || 0
                                                    // compute booked as total - sum of available seats across slots
                                                    const availSlots = availabilityMap[selectedDateKey] || []
                                                    const availSum = availSlots.reduce((s,it) => s + (it.availableSeats||0), 0)
                                                const booked = Math.max(0, total - availSum)
                                                return `Seats: ${total} total • ${booked} booked • ${availSum} remaining`
                                            })()}
                                        </div>
                                    </div>
                                ) : <div className='text-sm text-gray-400'>Select a day to view slots</div>}
                            </div>
                            <div className='flex items-center gap-2'>
                                <button className='px-3 py-1 rounded-full border text-xs'>12h</button>
                                <button className='px-3 py-1 rounded-full border text-xs'>24h</button>
                            </div>
                        </div>
                        <div className='grid grid-cols-1 gap-3'>
                            {selectedDateKey && (
                                <div className='mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3'>
                                    {(() => {
                                        const meta = dayMetaMap[selectedDateKey] || { totalSeats: 0 }
                                        const total = meta.totalSeats || 0
                                    const availSlots = availabilityMap[selectedDateKey] || []
                                    const availSum = availSlots.reduce((s,it) => s + (it.availableSeats||0), 0)
                                        const booked = Math.max(0, total - availSum)
                                        return (
                                            <> 
                                            <div className='p-3 border rounded text-sm'>
                                                <div className='text-gray-500'>Total seats</div>
                                                <div className='text-lg font-semibold'>{total}</div>
                                            </div>
                                            <div className='p-3 border rounded text-sm'>
                                                <div className='text-gray-500'>Booked</div>
                                                <div className='text-lg font-semibold'>{booked}</div>
                                            </div>
                                            <div className='p-3 border rounded text-sm'>
                                                <div className='text-gray-500'>Available</div>
                                                <div className='text-lg font-semibold'>{availSum}</div>
                                            </div>
                                            </>
                                        )
                                    })()}
                                </div>
                            )}
                            <div className='max-h-96 overflow-y-auto space-y-3 pr-2'>
                            {(selectedDateKey && availabilityMap[selectedDateKey]) ? (
                                availabilityMap[selectedDateKey]
                                // show all slots including 0-seat slots so users can see fully booked times
                                .filter((it) => typeof it.availableSeats !== 'undefined')
                                .map((item, index) => (
                                    <div key={index} className={`slot-card ${slotTime===item.time? 'border-primary shadow-sm':''}`}>
                                        <div className='flex items-center gap-4'>
                                            <div className='text-left w-28'>
                                                <div className='slot-time'>{item.time}</div>
                                                <div className='slot-meta'>{/* optional meta */}</div>
                                            </div>
                                            <div>
                                                <div className='text-xs text-gray-500'>
                                                    {(() => {
                                                        const available = item.availableSeats ?? item.seats ?? 0
                                                        // avoid mixing ?? with || to keep Babel parser happy
                                                        const total = (typeof item.totalSeats !== 'undefined') ? item.totalSeats : ((dayMetaMap[selectedDateKey] && dayMetaMap[selectedDateKey].totalSeats) || 0)
                                                        const booked = (typeof item.bookedSeats !== 'undefined') ? item.bookedSeats : Math.max(0, total - available)
                                                        return (
                                                            <>
                                                                <span className={`inline-block w-2 h-2 rounded-full mr-2 align-middle ${available>0? 'bg-emerald-400':'bg-gray-300'}`}></span>
                                                                {available} available • {booked} booked • {total} total
                                                            </>
                                                        )
                                                    })()}
                                                </div>
                                            </div>
                                        </div>
                                        <div className='flex items-center gap-3'>
                                            {((item.availableSeats ?? item.seats ?? 0) > 0) ? (
                                                <button onClick={() => { setSlotTime(item.time) }} className={`slot-select-btn ${slotTime===item.time? 'bg-primary text-white':'border text-sm'}`}>{(item.availableSeats ?? item.seats ?? 0)} Select</button>
                                            ) : (
                                                <button disabled className='text-sm px-3 py-1 rounded-full bg-gray-100 text-gray-400 border'>Full</button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className='text-sm text-gray-500'>No slots available for selected day</div>
                            )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className='flex flex-col gap-3 mt-4 max-w-md'>
                    <input 
                        type="text" 
                        placeholder="Patient Name" 
                        value={patientName} 
                        onChange={(e) => setPatientName(e.target.value)} 
                        className='border border-[#B4B4B4] rounded-lg px-4 py-2 text-sm'
                    />
                    <input 
                        type="tel" 
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={10}
                        placeholder="Mobile Number (10 digits)" 
                        value={patientMobile} 
                        onChange={(e) => { const v = e.target.value.replace(/\D/g,'').slice(0,10); setPatientMobile(v) }} 
                        className='border border-[#B4B4B4] rounded-lg px-4 py-2 text-sm'
                    />
                </div>

                <button onClick={bookAppointment} className='bg-primary text-white text-sm font-light px-20 py-3 rounded-full my-6'>Book an appointment</button>
            </div>

            {/* Listing Releated Doctors */}
            <RelatedDoctors speciality={docInfo.speciality} docId={docId} />
        </div>
    ) : null
}

export default Appointment