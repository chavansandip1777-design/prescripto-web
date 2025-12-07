import React, { useEffect, useState, useContext } from 'react'
import axios from 'axios'
import { AdminContext } from '../../context/AdminContext'
import { toast } from 'react-toastify'

const BookingLimits = () => {
    const { aToken } = useContext(AdminContext)
    const backendUrl = import.meta.env.VITE_BACKEND_URL

    const [minimumNotice, setMinimumNotice] = useState(12)
    const [minimumNoticeUnit, setMinimumNoticeUnit] = useState('hours')
    const [timeSlotInterval, setTimeSlotInterval] = useState(30)
    const [limitUpcomingBookings, setLimitUpcomingBookings] = useState(0)
    const [limitFutureBookingValue, setLimitFutureBookingValue] = useState(30)
    const [limitFutureBookingUnit, setLimitFutureBookingUnit] = useState('days')

    const fetchConfig = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/admin/booking-config', { headers: { aToken } })
            if (data.success && data.config) {
                const config = data.config
                setMinimumNotice(config.minimumNotice || 12)
                setMinimumNoticeUnit(config.minimumNoticeUnit || 'hours')
                setTimeSlotInterval(config.timeSlotInterval || 30)
                setLimitUpcomingBookings(config.limitUpcomingBookings || 0)
                setLimitFutureBookingValue(config.limitFutureBookingValue || 30)
                setLimitFutureBookingUnit(config.limitFutureBookingUnit || 'days')
            }
        } catch (error) {
            toast.error(error.message)
        }
    }

    const saveConfig = async () => {
        try {
            const { data } = await axios.post(
                backendUrl + '/api/admin/booking-config',
                {
                    minimumNotice,
                    minimumNoticeUnit,
                    timeSlotInterval,
                    limitUpcomingBookings,
                    limitFutureBookingValue,
                    limitFutureBookingUnit
                },
                { headers: { aToken } }
            )
            
            if (data.success) {
                toast.success('Limits saved successfully')
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.message)
        }
    }

    useEffect(() => {
        fetchConfig()
    }, [])

    return (
        <div className='p-6 max-w-4xl'>
            <div className='flex items-center gap-2 mb-6'>
                <span className='text-2xl'>⏱️</span>
                <h2 className='text-2xl font-semibold'>Limits</h2>
            </div>
            <p className='text-gray-600 mb-6'>Configure booking restrictions and time limits</p>

            <div className='bg-white rounded-lg shadow-sm p-6 space-y-8'>
                
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
                <div className='pt-6 border-t'>
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
                <div className='pt-6 border-t'>
                    <label className='block text-sm font-medium text-gray-700 mb-2'>
                        Limit number of upcoming bookings per booker
                    </label>
                    <p className='text-sm text-gray-500 mb-3'>
                        Maximum number of active bookings a user can have at once (0 = unlimited)
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
                <div className='pt-6 border-t'>
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

                <div className='pt-6 border-t'>
                    <button
                        onClick={saveConfig}
                        className='bg-primary text-white px-8 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors'
                    >
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    )
}

export default BookingLimits
