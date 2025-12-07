import React, { useEffect, useState, useContext } from 'react'
import axios from 'axios'
import { AdminContext } from '../../context/AdminContext'
import { toast } from 'react-toastify'

const BookingBasics = () => {
    const { aToken } = useContext(AdminContext)
    const backendUrl = import.meta.env.VITE_BACKEND_URL

    const [eventTitle, setEventTitle] = useState('')
    const [eventDescription, setEventDescription] = useState('')
    const [eventDuration, setEventDuration] = useState(30)

    const fetchConfig = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/admin/booking-config', { headers: { aToken } })
            if (data.success && data.config) {
                setEventTitle(data.config.eventTitle || '')
                setEventDescription(data.config.eventDescription || '')
                setEventDuration(data.config.eventDuration || 30)
            }
        } catch (error) {
            toast.error(error.message)
        }
    }

    const saveConfig = async () => {
        try {
            const { data } = await axios.post(
                backendUrl + '/api/admin/booking-config',
                { eventTitle, eventDescription, eventDuration },
                { headers: { aToken } }
            )
            
            if (data.success) {
                toast.success('Basics saved successfully')
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
                <span className='text-2xl'>🔗</span>
                <h2 className='text-2xl font-semibold'>Basics</h2>
            </div>
            <p className='text-gray-600 mb-6'>Configure the basic details of your booking event</p>

            <div className='bg-white rounded-lg shadow-sm p-6 space-y-6'>
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
                    <p className='text-sm text-gray-500 mt-1'>This will be displayed as the main heading on your booking page</p>
                </div>

                <div>
                    <label className='block text-sm font-medium text-gray-700 mb-2'>
                        Description
                    </label>
                    <textarea
                        value={eventDescription}
                        onChange={(e) => setEventDescription(e.target.value)}
                        placeholder='Counselling will be conducted over the phone. Our expert psychologists will guide you through your needs...'
                        rows={6}
                        className='w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary focus:border-transparent'
                    />
                    <p className='text-sm text-gray-500 mt-1'>Provide details about what to expect during the appointment</p>
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
                    <p className='text-sm text-gray-500 mt-1'>How long each appointment will last</p>
                </div>

                <div className='pt-4'>
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

export default BookingBasics
