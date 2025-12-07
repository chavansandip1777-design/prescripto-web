import React, { useEffect, useState, useContext } from 'react'
import axios from 'axios'
import { AdminContext } from '../../context/AdminContext'
import { toast } from 'react-toastify'

const BookingAvailability = () => {
    const { aToken } = useContext(AdminContext)
    const backendUrl = import.meta.env.VITE_BACKEND_URL

    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [workingHours, setWorkingHours] = useState({
        monday: { enabled: true, start: '10:30', end: '18:30' },
        tuesday: { enabled: true, start: '10:30', end: '18:30' },
        wednesday: { enabled: true, start: '10:30', end: '18:30' },
        thursday: { enabled: true, start: '10:30', end: '18:30' },
        friday: { enabled: true, start: '10:30', end: '18:30' },
        saturday: { enabled: true, start: '10:30', end: '18:30' },
        sunday: { enabled: false, start: '10:30', end: '18:30' }
    })

    const fetchConfig = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/admin/booking-config', { headers: { aToken } })
            if (data.success && data.config) {
                if (data.config.workingHours) {
                    setWorkingHours(data.config.workingHours)
                }
                if (data.config.startDate) {
                    setStartDate(new Date(data.config.startDate).toISOString().split('T')[0])
                }
                if (data.config.endDate) {
                    setEndDate(new Date(data.config.endDate).toISOString().split('T')[0])
                }
            }
        } catch (error) {
            toast.error(error.message)
        }
    }

    const saveConfig = async () => {
        try {
            const payload = { workingHours }
            if (startDate) payload.startDate = startDate
            if (endDate) payload.endDate = endDate

            const { data } = await axios.post(
                backendUrl + '/api/admin/booking-config',
                payload,
                { headers: { aToken } }
            )
            
            if (data.success) {
                toast.success('Availability saved successfully')
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

    const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

    return (
        <div className='p-6 max-w-4xl'>
            <div className='flex items-center gap-2 mb-6'>
                <span className='text-2xl'>📅</span>
                <h2 className='text-2xl font-semibold'>Availability</h2>
            </div>
            <p className='text-gray-600 mb-6'>Set your available hours for each day of the week and date range</p>

            <div className='bg-white rounded-lg shadow-sm p-6 mb-6'>
                <h3 className='text-lg font-semibold mb-4'>Date Range</h3>
                <p className='text-gray-600 text-sm mb-4'>Define the period when appointments can be booked</p>
                
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <div>
                        <label className='block text-sm font-medium text-gray-700 mb-2'>
                            Start Date
                        </label>
                        <input
                            type='date'
                            value={startDate}
                            min={new Date().toISOString().split('T')[0]}
                            onChange={(e) => setStartDate(e.target.value)}
                            className='w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent'
                        />
                    </div>
                    <div>
                        <label className='block text-sm font-medium text-gray-700 mb-2'>
                            End Date
                        </label>
                        <input
                            type='date'
                            value={endDate}
                            min={startDate || new Date().toISOString().split('T')[0]}
                            onChange={(e) => setEndDate(e.target.value)}
                            className='w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent'
                        />
                    </div>
                </div>
            </div>

            <div className='bg-white rounded-lg shadow-sm p-6'>
                <h3 className='text-lg font-semibold mb-4'>Working Hours</h3>
                
                <div className='space-y-3'>
                    {daysOfWeek.map(day => (
                        <div key={day} className='flex items-center gap-4 p-4 border rounded-lg hover:border-primary/50 transition-colors'>
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
                                        className='border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent'
                                    />
                                    <span className='text-gray-500'>to</span>
                                    <input
                                        type='time'
                                        value={workingHours[day].end}
                                        onChange={(e) => handleWorkingHoursChange(day, 'end', e.target.value)}
                                        className='border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent'
                                    />
                                </div>
                            ) : (
                                <span className='text-gray-400 flex-1'>Unavailable</span>
                            )}
                        </div>
                    ))}
                </div>

                <div className='mt-6 pt-6 border-t'>
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

export default BookingAvailability
