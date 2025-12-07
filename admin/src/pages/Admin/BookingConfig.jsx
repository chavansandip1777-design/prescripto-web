import React, { useEffect, useState, useContext } from 'react'
import axios from 'axios'
import { AdminContext } from '../../context/AdminContext'
import { toast } from 'react-toastify'

const BookingConfig = () => {
    const { aToken } = useContext(AdminContext)
    const backendUrl = import.meta.env.VITE_BACKEND_URL

    const [activeTab, setActiveTab] = useState('basics')
    
    // Basics Tab
    const [eventTitle, setEventTitle] = useState('')
    const [eventDescription, setEventDescription] = useState('')
    const [eventDuration, setEventDuration] = useState(30)

    // Availability Tab
    const [workingHours, setWorkingHours] = useState({
        monday: { enabled: true, start: '10:30', end: '18:30' },
        tuesday: { enabled: true, start: '10:30', end: '18:30' },
        wednesday: { enabled: true, start: '10:30', end: '18:30' },
        thursday: { enabled: true, start: '10:30', end: '18:30' },
        friday: { enabled: true, start: '10:30', end: '18:30' },
        saturday: { enabled: true, start: '10:30', end: '18:30' },
        sunday: { enabled: false, start: '10:30', end: '18:30' }
    })

    // Limits Tab
    const [minimumNotice, setMinimumNotice] = useState(12)
    const [minimumNoticeUnit, setMinimumNoticeUnit] = useState('hours')
    const [timeSlotInterval, setTimeSlotInterval] = useState(30)
    const [limitUpcomingBookings, setLimitUpcomingBookings] = useState(0)
    const [limitFutureBookingValue, setLimitFutureBookingValue] = useState(30)
    const [limitFutureBookingUnit, setLimitFutureBookingUnit] = useState('days')

    // Advanced Tab
    const [redirectUrl, setRedirectUrl] = useState('')
    const [seatsPerSlot, setSeatsPerSlot] = useState(1)
    const [offerSeats, setOfferSeats] = useState(false)

    const fetchConfig = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/admin/booking-config', { headers: { aToken } })
            if (data.success && data.config) {
                const config = data.config
                
                // Basics
                setEventTitle(config.eventTitle || '')
                setEventDescription(config.eventDescription || '')
                setEventDuration(config.eventDuration || 30)

                // Availability
                if (config.workingHours) {
                    setWorkingHours(config.workingHours)
                }

                // Limits
                setMinimumNotice(config.minimumNotice || 12)
                setMinimumNoticeUnit(config.minimumNoticeUnit || 'hours')
                setTimeSlotInterval(config.timeSlotInterval || 30)
                setLimitUpcomingBookings(config.limitUpcomingBookings || 0)
                setLimitFutureBookingValue(config.limitFutureBookingValue || 30)
                setLimitFutureBookingUnit(config.limitFutureBookingUnit || 'days')

                // Advanced
                setRedirectUrl(config.redirectUrl || '')
                setSeatsPerSlot(config.seatsPerSlot || 1)
                setOfferSeats(config.offerSeats || false)
            }
        } catch (error) {
            toast.error(error.message)
        }
    }

    const saveConfig = async () => {
        try {
            const configData = {
                // Basics
                eventTitle,
                eventDescription,
                eventDuration,
                
                // Availability
                workingHours,
                
                // Limits
                minimumNotice,
                minimumNoticeUnit,
                timeSlotInterval,
                limitUpcomingBookings,
                limitFutureBookingValue,
                limitFutureBookingUnit,
                
                // Advanced
                redirectUrl,
                seatsPerSlot,
                offerSeats
            }

            const { data } = await axios.post(
                backendUrl + '/api/admin/booking-config',
                configData,
                { headers: { aToken } }
            )
            
            if (data.success) {
                toast.success('Configuration saved successfully')
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.message)
        }
    }

    const handleWorkingHoursChange = (day, field, value) => {
        setWorkingHours(prev => ({
            ...prev,
            [day]: {
                ...prev[day],
                [field]: value
            }
        }))
    }

    useEffect(() => {
        fetchConfig()
    }, [])

    const tabs = [
        { id: 'basics', label: 'Basics', icon: '🔗' },
        { id: 'availability', label: 'Availability', icon: '📅' },
        { id: 'limits', label: 'Limits', icon: '⏱️' },
        { id: 'advanced', label: 'Advanced', icon: '⚙️' }
    ]

    const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

    return (
        <div className='p-6 max-w-6xl mx-auto'>
            <h2 className='text-2xl font-semibold mb-6'>Booking Configuration</h2>

            {/* Tab Navigation */}
            <div className='flex gap-2 mb-6 border-b'>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-3 flex items-center gap-2 font-medium transition-colors ${
                            activeTab === tab.id
                                ? 'border-b-2 border-primary text-primary'
                                : 'text-gray-600 hover:text-gray-800'
                        }`}
                    >
                        <span>{tab.icon}</span>
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className='bg-white rounded-lg shadow-sm p-6'>
                
                {/* BASICS TAB */}
                {activeTab === 'basics' && (
                    <div className='space-y-6'>
                        <div>
                            <label className='block text-sm font-medium text-gray-700 mb-2'>
                                Event Title
                            </label>
                            <input
                                type='text'
                                value={eventTitle}
                                onChange={(e) => setEventTitle(e.target.value)}
                                placeholder='e.g., Book your FREE DYCE Counselling Session'
                                className='w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary focus:border-transparent'
                            />
                        </div>

                        <div>
                            <label className='block text-sm font-medium text-gray-700 mb-2'>
                                Description
                            </label>
                            <textarea
                                value={eventDescription}
                                onChange={(e) => setEventDescription(e.target.value)}
                                placeholder='Counselling will be conducted over the phone. Our expert psychologists will guide you through your needs...'
                                rows={5}
                                className='w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary focus:border-transparent'
                            />
                        </div>

                        <div>
                            <label className='block text-sm font-medium text-gray-700 mb-2'>
                                Duration (minutes)
                            </label>
                            <input
                                type='number'
                                value={eventDuration}
                                onChange={(e) => setEventDuration(Number(e.target.value))}
                                min='15'
                                step='15'
                                className='w-full max-w-xs border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary focus:border-transparent'
                            />
                            <p className='text-sm text-gray-500 mt-1'>Event duration in minutes</p>
                        </div>
                    </div>
                )}

                {/* AVAILABILITY TAB */}
                {activeTab === 'availability' && (
                    <div className='space-y-6'>
                        <h3 className='text-lg font-semibold mb-4'>Working Hours</h3>
                        <p className='text-sm text-gray-600 mb-4'>Set your available hours for each day of the week</p>
                        
                        <div className='space-y-3'>
                            {daysOfWeek.map(day => (
                                <div key={day} className='flex items-center gap-4 p-4 border rounded-lg'>
                                    <div className='w-32'>
                                        <label className='flex items-center gap-2 cursor-pointer'>
                                            <input
                                                type='checkbox'
                                                checked={workingHours[day].enabled}
                                                onChange={(e) => handleWorkingHoursChange(day, 'enabled', e.target.checked)}
                                                className='w-4 h-4 text-primary rounded focus:ring-primary'
                                            />
                                            <span className='font-medium capitalize'>{day}</span>
                                        </label>
                                    </div>

                                    {workingHours[day].enabled ? (
                                        <div className='flex items-center gap-4 flex-1'>
                                            <input
                                                type='time'
                                                value={workingHours[day].start}
                                                onChange={(e) => handleWorkingHoursChange(day, 'start', e.target.value)}
                                                className='border border-gray-300 rounded px-3 py-2'
                                            />
                                            <span className='text-gray-500'>to</span>
                                            <input
                                                type='time'
                                                value={workingHours[day].end}
                                                onChange={(e) => handleWorkingHoursChange(day, 'end', e.target.value)}
                                                className='border border-gray-300 rounded px-3 py-2'
                                            />
                                        </div>
                                    ) : (
                                        <span className='text-gray-400 flex-1'>Unavailable</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* LIMITS TAB */}
                {activeTab === 'limits' && (
                    <div className='space-y-6'>
                        {/* Minimum Notice */}
                        <div>
                            <label className='block text-sm font-medium text-gray-700 mb-2'>
                                Minimum Notice
                            </label>
                            <p className='text-sm text-gray-500 mb-3'>
                                How much notice do you need before a booking can be made?
                            </p>
                            <div className='flex gap-3 max-w-md'>
                                <input
                                    type='number'
                                    value={minimumNotice}
                                    onChange={(e) => setMinimumNotice(Number(e.target.value))}
                                    min='0'
                                    className='flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary focus:border-transparent'
                                />
                                <select
                                    value={minimumNoticeUnit}
                                    onChange={(e) => setMinimumNoticeUnit(e.target.value)}
                                    className='border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary focus:border-transparent'
                                >
                                    <option value='minutes'>Minutes</option>
                                    <option value='hours'>Hours</option>
                                    <option value='days'>Days</option>
                                </select>
                            </div>
                        </div>

                        {/* Time Slot Intervals */}
                        <div>
                            <label className='block text-sm font-medium text-gray-700 mb-2'>
                                Time-slot intervals
                            </label>
                            <p className='text-sm text-gray-500 mb-3'>
                                The frequency of available booking slots
                            </p>
                            <select
                                value={timeSlotInterval}
                                onChange={(e) => setTimeSlotInterval(Number(e.target.value))}
                                className='max-w-md border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary focus:border-transparent'
                            >
                                <option value={15}>15 Minutes</option>
                                <option value={30}>30 Minutes</option>
                                <option value={45}>45 Minutes</option>
                                <option value={60}>60 Minutes</option>
                            </select>
                        </div>

                        {/* Limit Upcoming Bookings */}
                        <div>
                            <label className='block text-sm font-medium text-gray-700 mb-2'>
                                Limit number of upcoming bookings per booker
                            </label>
                            <p className='text-sm text-gray-500 mb-3'>
                                Maximum number of active bookings a user can have (0 = unlimited)
                            </p>
                            <input
                                type='number'
                                value={limitUpcomingBookings}
                                onChange={(e) => setLimitUpcomingBookings(Number(e.target.value))}
                                min='0'
                                className='max-w-xs border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary focus:border-transparent'
                            />
                        </div>

                        {/* Limit Future Bookings */}
                        <div>
                            <label className='block text-sm font-medium text-gray-700 mb-2'>
                                Limit future bookings
                            </label>
                            <p className='text-sm text-gray-500 mb-3'>
                                How far in advance can bookings be made?
                            </p>
                            <div className='flex gap-3 max-w-md'>
                                <input
                                    type='number'
                                    value={limitFutureBookingValue}
                                    onChange={(e) => setLimitFutureBookingValue(Number(e.target.value))}
                                    min='1'
                                    className='flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary focus:border-transparent'
                                />
                                <select
                                    value={limitFutureBookingUnit}
                                    onChange={(e) => setLimitFutureBookingUnit(e.target.value)}
                                    className='border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary focus:border-transparent'
                                >
                                    <option value='days'>Days</option>
                                    <option value='weeks'>Weeks</option>
                                    <option value='months'>Months</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                {/* ADVANCED TAB */}
                {activeTab === 'advanced' && (
                    <div className='space-y-6'>
                        {/* Redirect on Booking */}
                        <div>
                            <label className='block text-sm font-medium text-gray-700 mb-2'>
                                Redirect on booking
                            </label>
                            <p className='text-sm text-gray-500 mb-3'>
                                Redirect users to a custom URL after booking (optional)
                            </p>
                            <input
                                type='url'
                                value={redirectUrl}
                                onChange={(e) => setRedirectUrl(e.target.value)}
                                placeholder='https://example.com/thank-you'
                                className='w-full max-w-2xl border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary focus:border-transparent'
                            />
                        </div>

                        {/* Offer Seats */}
                        <div className='border-t pt-6'>
                            <div className='flex items-start gap-3'>
                                <input
                                    type='checkbox'
                                    id='offerSeats'
                                    checked={offerSeats}
                                    onChange={(e) => setOfferSeats(e.target.checked)}
                                    className='mt-1 w-4 h-4 text-primary rounded focus:ring-primary'
                                />
                                <div className='flex-1'>
                                    <label htmlFor='offerSeats' className='block text-sm font-medium text-gray-700 mb-1 cursor-pointer'>
                                        Offer seats
                                    </label>
                                    <p className='text-sm text-gray-500 mb-3'>
                                        Enable multiple people to book the same time slot
                                    </p>
                                </div>
                            </div>

                            {offerSeats && (
                                <div className='mt-4 ml-7'>
                                    <label className='block text-sm font-medium text-gray-700 mb-2'>
                                        Seats per time slot
                                    </label>
                                    <input
                                        type='number'
                                        value={seatsPerSlot}
                                        onChange={(e) => setSeatsPerSlot(Number(e.target.value))}
                                        min='1'
                                        max='100'
                                        className='max-w-xs border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary focus:border-transparent'
                                    />
                                    <p className='text-sm text-gray-500 mt-1'>
                                        Number of people who can book each slot
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Save Button */}
            <div className='mt-6 flex justify-end'>
                <button
                    onClick={saveConfig}
                    className='bg-primary text-white px-8 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors'
                >
                    Save Configuration
                </button>
            </div>
        </div>
    )
}

export default BookingConfig
