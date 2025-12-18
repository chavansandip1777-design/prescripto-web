import React, { useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppContext } from '../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'
import Loader from '../components/Loader'

const BookAppointmentNew = () => {
    const { backendUrl } = useContext(AppContext)
    const navigate = useNavigate()

    const [availabilityMap, setAvailabilityMap] = useState({})
    const [selectedDate, setSelectedDate] = useState(null)
    const [selectedDateKey, setSelectedDateKey] = useState(null)
    const [selectedSlot, setSelectedSlot] = useState(null)
    const [currentMonth, setCurrentMonth] = useState(new Date())
    const [isLoading, setIsLoading] = useState(false)
    const [isCalendarLoading, setIsCalendarLoading] = useState(true)
    
    // Booking config state
    const [bookingConfig, setBookingConfig] = useState({
        eventTitle: '',
        eventDescription: '',
        startDate: null,
        endDate: null,
        workingHours: {
            monday: { enabled: true, start: '10:00', end: '17:00' },
            tuesday: { enabled: true, start: '10:00', end: '17:00' },
            wednesday: { enabled: true, start: '10:00', end: '17:00' },
            thursday: { enabled: true, start: '10:00', end: '17:00' },
            friday: { enabled: true, start: '10:00', end: '17:00' },
            saturday: { enabled: false, start: '00:00', end: '00:00' },
            sunday: { enabled: false, start: '00:00', end: '00:00' }
        },
        minimumNotice: 0,
        minimumNoticeUnit: 'hours',
        limitFutureBookingValue: 3,
        limitFutureBookingUnit: 'days',
        seatsPerSlot: 1,
        offerSeats: false,
        redirectUrl: ''
    })
    const [bookingConfigLoaded, setBookingConfigLoaded] = useState(false)
    
    // Form step
    const [step, setStep] = useState(1) // 1: Calendar & Slots, 2: Form
    
    // Form fields
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
        notes: ''
    })

    // Get booking configuration
    const getBookingConfig = async () => {
        try {
            console.log('[BookAppointmentNew] Fetching booking config...')
            // add cache-busting query param and request no-cache to avoid 304 Not Modified responses
            const res = await axios.get(backendUrl + '/api/booking/config?_=' + Date.now(), { headers: { 'Cache-Control': 'no-cache' } })
            console.log('[BookAppointmentNew] Booking config response status:', res.status)

            const data = res.data
            console.log('[BookAppointmentNew] Booking config response data:', data)

            if (res.status === 200 && data && data.success && data.config) {
                console.log('[BookAppointmentNew] Setting booking config:', data.config)
                const cfg = data.config
                setBookingConfig(prev => ({
                    ...prev,
                    eventTitle: cfg.eventTitle || prev.eventTitle,
                    eventDescription: cfg.eventDescription || prev.eventDescription,
                    startDate: cfg.startDate || prev.startDate,
                    endDate: cfg.endDate || prev.endDate,
                    workingHours: cfg.workingHours || prev.workingHours,
                    minimumNotice: cfg.minimumNotice || prev.minimumNotice,
                    minimumNoticeUnit: cfg.minimumNoticeUnit || prev.minimumNoticeUnit,
                    limitFutureBookingValue: cfg.limitFutureBookingValue || prev.limitFutureBookingValue,
                    limitFutureBookingUnit: cfg.limitFutureBookingUnit || prev.limitFutureBookingUnit,
                    seatsPerSlot: cfg.seatsPerSlot || prev.seatsPerSlot,
                    offerSeats: typeof cfg.offerSeats !== 'undefined' ? cfg.offerSeats : prev.offerSeats,
                    redirectUrl: cfg.redirectUrl || prev.redirectUrl
                }))
            } else {
                console.log('[BookAppointmentNew] Booking config not returned (status:', res.status, ')')
            }
        } catch (error) {
            console.error('[BookAppointmentNew] Error fetching booking config:', error)
            // Keep defaults if fetch fails
        } finally {
            // Always mark loaded so UI doesn't get stuck on Loading...
            setBookingConfigLoaded(true)
        }
    }

    // Get availability
    const getAvailability = async () => {
        setIsLoading(true)
        setIsCalendarLoading(true)
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
                    
                    map[key] = item.slots.map(s => ({
                        ...s,
                        datetime: new Date(s.datetime),
                        availableSeats: s.availableSeats,
                        totalSeats: s.totalSeats
                    }))
                })
                
                setAvailabilityMap(map)
                
                // Give time for calendar to render with enabled dates
                requestAnimationFrame(() => {
                    setTimeout(() => {
                        setIsCalendarLoading(false)
                    }, 400)
                })
            } else {
                setIsCalendarLoading(false)
            }
        } catch (error) {
            console.log('Failed to fetch availability', error)
            toast.error('Failed to load availability')
            setIsCalendarLoading(false)
        } finally {
            setIsLoading(false)
        }
    }

    // Parse date key to Date object
    const parseDateKey = (key) => {
        const [d, m, y] = key.split('_').map(Number)
        return new Date(y, m - 1, d)
    }

    // Format date key with zero-padding to match API format
    const formatDateKey = (date) => {
        const day = String(date.getDate()).padStart(2, '0')
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const year = date.getFullYear()
        return `${day}_${month}_${year}`
    }

    // Handle date selection
    const handleDateSelect = (date, key) => {
        setSelectedDate(date)
        setSelectedDateKey(key)
        setSelectedSlot(null)
    }

    // Handle slot selection
    const handleSlotSelect = (slot) => {
        if (slot.availableSeats > 0) {
            setSelectedSlot(slot)
        }
    }

    // Handle form submit
    const handleFormSubmit = async (e) => {
        e.preventDefault()

        if (!selectedSlot || !selectedDateKey) {
            toast.error('Please select a date and time')
            return
        }

        // Validate phone
        if (!/^\d{10}$/.test(formData.phone)) {
            toast.error('Please enter a valid 10-digit mobile number')
            return
        }

        try {
            setIsLoading(true)

            const { data } = await axios.post(backendUrl + '/api/booking/book', {
                slotDate: selectedDateKey,
                slotTime: selectedSlot.time,
                patientName: formData.name,
                patientEmail: formData.email,
                patientMobile: formData.phone,
                patientAddress: formData.address,
                notes: formData.notes
            })

            if (data.success) {
                toast.success(data.message)
                
                // Store booking details
                sessionStorage.setItem('last_booking', JSON.stringify({
                    slotDate: selectedDateKey,
                    slotTime: selectedSlot.time,
                    name: formData.name,
                    email: formData.email,
                    phone: formData.phone,
                    address: formData.address,
                    appointmentId: data.appointmentId
                }))
                
                // Use configured redirect URL or default to booking confirmation
                if (bookingConfig.redirectUrl && bookingConfig.redirectUrl.trim() !== '') {
                    window.location.href = bookingConfig.redirectUrl
                } else {
                    navigate('/booking-confirmation')
                }
            } else {
                toast.error(data.message)
            }

        } catch (error) {
            console.log(error)
            toast.error('Failed to book appointment')
        } finally {
            setIsLoading(false)
        }
    }

    // Generate calendar days
    const generateCalendarDays = () => {
        const year = currentMonth.getFullYear()
        const month = currentMonth.getMonth()
        
        const firstDay = new Date(year, month, 1)
        const lastDay = new Date(year, month + 1, 0)
        const startDate = new Date(firstDay)
        startDate.setDate(startDate.getDate() - firstDay.getDay())
        
        const days = []
        const current = new Date(startDate)
        
        while (days.length < 42) {
            days.push(new Date(current))
            current.setDate(current.getDate() + 1)
        }
        
        return days
    }

    // Generate time slots for display
    const generateDisplayTimeSlots = (startHour, endHour) => {
        const slots = []
        for (let hour = startHour; hour < endHour; hour++) {
            for (let min of [0, 30]) {
                const h = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
                const period = hour >= 12 ? 'PM' : 'AM'
                const time = `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')} ${period}`
                slots.push(time)
            }
        }
        return slots
    }

    // Format time to 12-hour format
    const formatTime = (time) => {
        // If already in 12-hour format, return as is
        if (time.includes('AM') || time.includes('PM') || time.includes('am') || time.includes('pm')) {
            return time
        }
        
        // Convert 24-hour to 12-hour
        const [hourStr, minStr] = time.split(':')
        const hour = parseInt(hourStr)
        const min = minStr || '00'
        const h = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
        const period = hour >= 12 ? 'PM' : 'AM'
        return `${String(h).padStart(2, '0')}:${min} ${period}`
    }

    useEffect(() => {
        if (backendUrl) {
            getBookingConfig()
        }
    }, [backendUrl])

    useEffect(() => {
        if (backendUrl) {
            getAvailability()
            // Reset selection when month changes
            setSelectedDate(null)
            setSelectedDateKey(null)
            setSelectedSlot(null)
        }
    }, [currentMonth, backendUrl])

    const calendarDays = generateCalendarDays()
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

    if (step === 2) {
        // Form Step
        return (
            <div className='min-h-screen bg-gray-50 flex items-center justify-center p-4'>
                <div className='max-w-2xl w-full bg-white rounded-lg shadow-sm p-8'>
                    <button 
                        onClick={() => setStep(1)}
                        className='text-blue-600 hover:text-blue-700 mb-6 flex items-center gap-2'
                    >
                        ← Back to bookings
                    </button>

                    <div className='mb-6'>
                        <div className='flex items-center gap-3 mb-2'>
                            <div className='w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center text-white font-semibold'>
                                🏥
                            </div>
                            <div>
                                <h3 className='text-sm text-gray-600'>Book Appointment</h3>
                                <h1 className='text-2xl font-semibold text-gray-900'>
                                    {bookingConfigLoaded ? (bookingConfig.eventTitle || 'Doctor Appointment') : 'Loading...'}
                                </h1>
                                <p className='text-sm text-gray-600'>
                                    {bookingConfigLoaded ? (bookingConfig.eventDescription || 'Professional medical consultation') : ''}
                                </p>
                            </div>
                        </div>

                        <div className='mt-4 space-y-2 text-sm text-gray-700'>
                            <div className='flex items-center gap-2'>
                                <span>📅</span>
                                <span>{selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
                            </div>
                            <div className='flex items-center gap-2'>
                                <span>🕐</span>
                                <span>{selectedSlot?.time}</span>
                            </div>
                            <div className='flex items-center gap-2'>
                                <span>⏱️</span>
                                <span>30m</span>
                            </div>
                            <div className='flex items-center gap-2'>
                                <span>📍</span>
                                <span>In Person (Attendee Address)</span>
                            </div>
                            <div className='flex items-center gap-2'>
                                <span>🌏</span>
                                <span>Asia/Calcutta</span>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleFormSubmit} className='space-y-4'>
                        <div className='text-xs text-gray-500 mb-4'>
                            ⚡ Quick booking - Takes less than 2 minutes
                        </div>
                        <div>
                            <label className='block text-sm font-medium text-gray-700 mb-1'>
                                Your name <span className='text-red-500'>*</span>
                            </label>
                            <input
                                type='text'
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                                required
                            />
                        </div>

                        <div>
                            <label className='block text-sm font-medium text-gray-700 mb-1'>
                                Email address <span className='text-red-500'>*</span>
                            </label>
                            <input
                                type='email'
                                value={formData.email}
                                onChange={(e) => setFormData({...formData, email: e.target.value})}
                                className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                                required
                            />
                        </div>

                        <div>
                            <label className='block text-sm font-medium text-gray-700 mb-1'>
                                Mobile Number <span className='text-red-500'>*</span>
                            </label>
                            <input
                                type='tel'
                                inputMode='numeric'
                                pattern='[0-9]*'
                                maxLength={10}
                                value={formData.phone}
                                onChange={(e) => {
                                    const value = e.target.value.replace(/\D/g, '').slice(0, 10)
                                    setFormData({...formData, phone: value})
                                }}
                                className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                                required
                            />
                        </div>

                        <div>
                            <label className='block text-sm font-medium text-gray-700 mb-1'>
                                In Person (Attendee Address) <span className='text-red-500'>*</span>
                            </label>
                            <input
                                type='text'
                                value={formData.address}
                                onChange={(e) => setFormData({...formData, address: e.target.value})}
                                placeholder='Enter address'
                                className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                                required
                            />
                        </div>

                        <div>
                            <label className='block text-sm font-medium text-gray-700 mb-1'>
                                Additional notes
                            </label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                                placeholder='Please share anything that will help prepare for our meeting.'
                                rows={4}
                                className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                            />
                        </div>

                        <div className='text-xs text-gray-500 mt-4'>
                            By proceeding, you agree to our <a href='#' className='text-blue-600'>Terms</a> and <a href='#' className='text-blue-600'>Privacy Policy</a>.
                        </div>

                        <div className='flex gap-3 pt-4'>
                            <button
                                type='button'
                                onClick={() => setStep(1)}
                                className='px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50'
                            >
                                Back
                            </button>
                            <button
                                type='submit'
                                disabled={isLoading}
                                className='flex-1 px-6 py-2 bg-black text-white rounded-md hover:bg-gray-800 disabled:opacity-50'
                            >
                                {isLoading ? 'Booking...' : 'Confirm'}
                            </button>
                        </div>
                    </form>

                </div>
            </div>
        )
    }

    // Calendar & Slots Step
    return (
        <div className='min-h-screen bg-gray-50'>
            <div className='max-w-7xl mx-auto p-6'>
                <div className='bg-white rounded-lg shadow-sm overflow-hidden relative'>
                    {isCalendarLoading && (
                        <div className='absolute inset-0 bg-white bg-opacity-95 flex items-center justify-center z-50 rounded-lg'>
                            <Loader size='xlarge' />
                        </div>
                    )}
                    <div className='grid grid-cols-1 lg:grid-cols-2 min-h-[600px]'>
                        {/* Left Side - Event Details & Calendar */}
                        <div className='p-8 border-r border-gray-200'>
                            <div className='mb-8'>
                                <div className='flex items-center gap-3 mb-4'>
                                    <div className='w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center text-white text-2xl'>
                                        🏥
                                    </div>
                                    <div>
                                        <h3 className='text-sm text-gray-600'>Book Appointment</h3>
                                        <h1 className='text-2xl font-semibold text-gray-900'>
                                            {bookingConfigLoaded ? (bookingConfig.eventTitle || 'Doctor Appointment') : 'Loading...'}
                                        </h1>
                                        <p className='text-sm text-gray-600'>
                                            {bookingConfigLoaded ? (bookingConfig.eventDescription || 'Professional medical consultation') : ''}
                                        </p>
                                    </div>
                                </div>

                                <div className='space-y-2 text-sm text-gray-700'>
                                    {bookingConfig.startDate && bookingConfig.endDate ? (
                                        <div className='flex items-center gap-2'>
                                            <span>📅</span>
                                            <span>
                                                {new Date(bookingConfig.startDate).toLocaleDateString()} 
                                                &nbsp;-&nbsp; {new Date(bookingConfig.endDate).toLocaleDateString()}
                                            </span>
                                        </div>
                                    ) : (
                                        <div className='flex items-center gap-2'>
                                            <span>📅</span>
                                            <span>Available: All upcoming dates</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Calendar */}
                            <div>
                                <div className='flex items-center justify-between mb-4'>
                                    <h2 className='text-lg font-semibold'>
                                        {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                                    </h2>
                                    <div className='flex gap-2'>
                                        <button
                                            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                                            className='p-2 hover:bg-gray-100 rounded'
                                        >
                                            ←
                                        </button>
                                        <button
                                            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                                            className='p-2 hover:bg-gray-100 rounded'
                                        >
                                            →
                                        </button>
                                    </div>
                                </div>

                                <div className='grid grid-cols-7 gap-1 mb-2'>
                                    {dayNames.map(day => (
                                        <div key={day} className='text-center text-xs font-medium text-gray-500 py-2'>
                                            {day}
                                        </div>
                                    ))}
                                </div>

                                <div className='grid grid-cols-7 gap-1'>
                                    {calendarDays.map((date, index) => {
                                        const isCurrentMonth = date.getMonth() === currentMonth.getMonth()
                                        const dateKey = formatDateKey(date)
                                        const hasAvailability = availabilityMap[dateKey]?.some(s => s.availableSeats > 0)
                                        const isSelected = selectedDateKey === dateKey
                                        const isToday = date.toDateString() === new Date().toDateString()
                                        // Date is past only if it's before today (not including today)
                                        const yesterday = new Date()
                                        yesterday.setDate(yesterday.getDate() - 1)
                                        yesterday.setHours(23, 59, 59, 999)
                                        const isPast = date <= yesterday

                                        return (
                                            <button
                                                key={index}
                                                onClick={() => hasAvailability && !isPast ? handleDateSelect(date, dateKey) : null}
                                                disabled={!hasAvailability || isPast}
                                                className={`
                                                    aspect-square p-2 text-sm rounded-md transition-all
                                                    ${!isCurrentMonth ? 'text-gray-300' : ''}
                                                    ${isSelected ? 'bg-black text-white font-semibold' : ''}
                                                    ${!isSelected && hasAvailability && !isPast ? 'hover:bg-gray-100 cursor-pointer' : ''}
                                                    ${!hasAvailability || isPast ? 'text-gray-300 cursor-not-allowed' : ''}
                                                    ${isToday && !isSelected ? 'border-2 border-blue-500' : ''}
                                                `}
                                            >
                                                {date.getDate()}
                                                {hasAvailability && !isPast && (
                                                    <div className='w-1 h-1 bg-blue-500 rounded-full mx-auto mt-1'></div>
                                                )}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Right Side - Time Slots */}
                        <div className='p-8 bg-gray-50'>
                            {selectedDateKey ? (
                                <>
                                    <div className='flex items-center justify-between mb-4'>
                                        <h3 className='font-semibold text-gray-900'>
                                            {selectedDate?.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })}
                                        </h3>
                                        <div className='flex gap-2 text-sm'>
                                            <button className='px-3 py-1 bg-white border border-gray-200 rounded text-gray-700'>12h</button>
                                            <button className='px-3 py-1 bg-white border border-gray-200 rounded text-gray-700'>24h</button>
                                        </div>
                                    </div>

                                    <div className='space-y-2 max-h-[500px] overflow-y-auto'>
                                        {availabilityMap[selectedDateKey]?.map((slot, index) => (
                                            <button
                                                key={index}
                                                onClick={() => handleSlotSelect(slot)}
                                                disabled={slot.availableSeats === 0}
                                                className={`
                                                    w-full p-3 rounded-md border text-left transition-all
                                                    ${slot.availableSeats === 0 
                                                        ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' 
                                                        : selectedSlot?.time === slot.time
                                                            ? 'bg-blue-50 border-blue-500 text-blue-700'
                                                            : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                                    }
                                                `}
                                            >
                                                <div className='flex items-center justify-between'>
                                                    <span className='font-medium'>{formatTime(slot.time)}</span>
                                                    <span className='text-sm flex items-center gap-1'>
                                                        <span className={`w-2 h-2 rounded-full ${slot.availableSeats > 0 ? 'bg-green-400' : 'bg-red-400'}`}></span>
                                                        {slot.availableSeats > 0 
                                                            ? `${slot.availableSeats} Seat${slot.availableSeats !== 1 ? 's' : ''} available`
                                                            : 'Fully Booked'
                                                        }
                                                    </span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>

                                    {selectedSlot && (
                                        <div className='mt-6'>
                                            <button
                                                onClick={() => setStep(2)}
                                                className='w-full py-3 bg-black text-white rounded-md hover:bg-gray-800 font-medium'
                                            >
                                                Next
                                            </button>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className='flex items-center justify-center h-full text-gray-500'>
                                    <div className='text-center'>
                                        <div className='text-4xl mb-2'>📅</div>
                                        <p>Select a date to see available times</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    )
}

export default BookAppointmentNew
