import React, { useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppContext } from '../context/AppContext'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import axios from 'axios'
import { toast } from 'react-toastify'
import Loader from '../components/Loader'

const BookAppointment = () => {
    const { backendUrl } = useContext(AppContext)
    const navigate = useNavigate()

    const [availabilityMap, setAvailabilityMap] = useState({})
    const [selectedDateKey, setSelectedDateKey] = useState(null)
    const [slotTime, setSlotTime] = useState('')
    const [patientName, setPatientName] = useState('')
    const [patientMobile, setPatientMobile] = useState('')
    const [isBooking, setIsBooking] = useState(false)
    const [isSlotsLoading, setIsSlotsLoading] = useState(false)

    // Helper function to normalize date
    const normalizeSlotDateKey = (dateStr) => {
        if (!dateStr) return null
        
        if (typeof dateStr === 'string' && dateStr.includes('_') && !dateStr.includes('T') && !dateStr.includes('-')) {
            return dateStr
        }
        
        const date = new Date(dateStr)
        if (isNaN(date)) return null
        
        const day = String(date.getDate()).padStart(2, '0')
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const year = date.getFullYear()
        
        return `${day}_${month}_${year}`
    }

    // Get availability
    const getAvailability = async () => {
        setIsSlotsLoading(true)
        try {
            const { data } = await axios.get(backendUrl + '/api/booking/availability')
            
            if (data.success) {
                const map = {}
                
                data.availability.forEach(item => {
                    let key = item.date
                    if (typeof key === 'string' && (key.includes('T') || key.includes('-'))) {
                        const d = new Date(key)
                        if (!isNaN(d)) key = `${d.getDate()}_${d.getMonth()+1}_${d.getFullYear()}`
                    }
                    
                    const slots = item.slots.map(s => ({
                        ...s,
                        datetime: new Date(s.datetime),
                        availableSeats: s.availableSeats,
                        seats: s.availableSeats // backward compatibility
                    }))
                    
                    map[key] = slots
                })
                
                setAvailabilityMap(map)
                
                // Auto-select first available date
                if (data.availability.length) {
                    let firstKey = data.availability[0].date
                    if (typeof firstKey === 'string' && (firstKey.includes('T') || firstKey.includes('-'))) {
                        const d = new Date(firstKey)
                        if (!isNaN(d)) firstKey = `${d.getDate()}_${d.getMonth()+1}_${d.getFullYear()}`
                    }
                    
                    if (map[firstKey]) setSelectedDateKey(firstKey)
                }
            }
        } catch (error) {
            console.log('Failed to fetch availability', error)
            toast.error('Failed to load availability')
        } finally {
            setIsSlotsLoading(false)
        }
    }

    // Book appointment
    const bookAppointment = async () => {
        if (!slotTime) {
            toast.warning('Please select a time slot')
            return
        }

        if (!patientName || !patientMobile) {
            toast.warning('Please enter your name and mobile number')
            return
        }

        if (!selectedDateKey) {
            toast.warning('Please select a date')
            return
        }

        // Validate mobile number
        if (!/^\d{10}$/.test(patientMobile)) {
            toast.warning('Please enter a valid 10-digit mobile number')
            return
        }

        try {
            setIsBooking(true)

            const { data } = await axios.post(backendUrl + '/api/booking/book', {
                slotDate: selectedDateKey,
                slotTime,
                patientName,
                patientMobile
            })

            if (data.success) {
                toast.success(data.message)
                // Store booking details for confirmation page
                sessionStorage.setItem('last_booking', JSON.stringify({
                    slotDate: selectedDateKey,
                    slotTime,
                    name: patientName,
                    phone: patientMobile,
                    appointmentId: data.appointmentId
                }))
                
                navigate(`/booking-confirmation?slotDate=${selectedDateKey}&slotTime=${slotTime}&name=${encodeURIComponent(patientName)}&phone=${patientMobile}`)
            } else {
                toast.error(data.message)
            }

        } catch (error) {
            console.log(error)
            toast.error('Failed to book appointment')
        } finally {
            setIsBooking(false)
        }
    }

    useEffect(() => {
        getAvailability()
    }, [])

    return (
        <div className='max-w-6xl mx-auto p-4'>
            <div className='text-center mb-8'>
                <h1 className='text-3xl font-bold text-gray-800 mb-2'>Book an Appointment</h1>
                <p className='text-gray-600'>
                    Select a convenient date and time for your appointment
                </p>
                <div className='mt-4 bg-blue-50 p-4 rounded-lg'>
                    <div className='text-sm text-blue-800'>
                        <p><strong>Availability:</strong> Monday – Friday, 10:00 AM – 5:00 PM</p>
                        <p><strong>Duration:</strong> 30 minutes per slot</p>
                        <p><strong>Cancellation:</strong> Up to 12 hours before appointment</p>
                    </div>
                </div>
            </div>

            <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
                {/* Calendar */}
                <div className='bg-white rounded-lg shadow-sm p-4'>
                    <h2 className='text-xl font-semibold mb-4'>Select Date</h2>
                    <FullCalendar
                        plugins={[dayGridPlugin, interactionPlugin]}
                        initialView='dayGridMonth'
                        height={400}
                        headerToolbar={{
                            left: 'prev,next today',
                            center: 'title',
                            right: ''
                        }}
                        dateClick={(info) => {
                            const d = info.date
                            const key = `${d.getDate()}_${d.getMonth()+1}_${d.getFullYear()}`
                            
                            if (availabilityMap[key]) {
                                setSelectedDateKey(key)
                                setSlotTime('') // Reset selected slot
                            } else {
                                toast.warning('No appointments available on this date')
                            }
                        }}
                        dayCellClassNames={(arg) => {
                            const d = arg.date
                            const key = `${d.getDate()}_${d.getMonth()+1}_${d.getFullYear()}`
                            const classes = []
                            
                            if (availabilityMap[key]) {
                                classes.push('fc-available-day')
                            }
                            
                            if (selectedDateKey) {
                                const parts = selectedDateKey.split('_')
                                const sd = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]))
                                if (sd.getFullYear() === d.getFullYear() && 
                                    sd.getMonth() === d.getMonth() && 
                                    sd.getDate() === d.getDate()) {
                                    classes.push('fc-selected-day')
                                }
                            }
                            
                            return classes.join(' ')
                        }}
                        validRange={{
                            start: new Date()
                        }}
                    />
                </div>

                {/* Time Slots and Booking Form */}
                <div className='space-y-6'>
                    {/* Time Slots */}
                    <div className='bg-white rounded-lg shadow-sm p-4'>
                        <h2 className='text-xl font-semibold mb-4'>Available Time Slots</h2>
                        
                        {selectedDateKey ? (
                            <div>
                                <div className='mb-4'>
                                    <div className='text-lg font-medium'>{(() => {
                                        const [d,m,y] = selectedDateKey.split('_')
                                        const dateObj = new Date(Number(y), Number(m)-1, Number(d))
                                        return dateObj.toLocaleDateString(undefined, { 
                                            weekday: 'long', 
                                            month: 'long', 
                                            day: 'numeric' 
                                        })
                                    })()}</div>
                                </div>
                                
                                {isSlotsLoading ? (
                                    <div className='flex items-center justify-center py-8'>
                                        <Loader />
                                    </div>
                                ) : (
                                    <div className='grid grid-cols-2 gap-2 max-h-64 overflow-y-auto'>
                                        {availabilityMap[selectedDateKey]?.filter(slot => slot.availableSeats > 0).map((slot, index) => (
                                            <button
                                                key={index}
                                                onClick={() => setSlotTime(slot.time)}
                                                className={`p-3 text-sm border rounded-lg transition-colors ${
                                                    slotTime === slot.time 
                                                        ? 'bg-blue-600 text-white border-blue-600' 
                                                        : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                                                }`}
                                            >
                                                {slot.time}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className='text-center text-gray-500 py-8'>
                                Please select a date to view available time slots
                            </div>
                        )}
                    </div>

                    {/* Booking Form */}
                    <div className='bg-white rounded-lg shadow-sm p-4'>
                        <h2 className='text-xl font-semibold mb-4'>Your Details</h2>
                        
                        <div className='space-y-4'>
                            <div>
                                <label className='block text-sm font-medium text-gray-700 mb-1'>
                                    Full Name *
                                </label>
                                <input
                                    type='text'
                                    value={patientName}
                                    onChange={(e) => setPatientName(e.target.value)}
                                    placeholder='Enter your full name'
                                    className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                                    required
                                />
                            </div>
                            
                            <div>
                                <label className='block text-sm font-medium text-gray-700 mb-1'>
                                    Mobile Number *
                                </label>
                                <input
                                    type='tel'
                                    inputMode='numeric'
                                    pattern='[0-9]*'
                                    maxLength={10}
                                    value={patientMobile}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/\D/g, '').slice(0, 10)
                                        setPatientMobile(value)
                                    }}
                                    placeholder='10-digit mobile number'
                                    className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                                    required
                                />
                            </div>
                            
                            <button
                                onClick={bookAppointment}
                                disabled={isBooking || !slotTime || !patientName || !patientMobile}
                                className='w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                            >
                                {isBooking ? 'Booking...' : 'Book Appointment'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default BookAppointment