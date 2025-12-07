import React, { useEffect, useState, useContext } from 'react'
import axios from 'axios'
import { AdminContext } from '../../context/AdminContext'
import { toast } from 'react-toastify'

const BookingAdvanced = () => {
    const { aToken } = useContext(AdminContext)
    const backendUrl = import.meta.env.VITE_BACKEND_URL

    const [redirectUrl, setRedirectUrl] = useState('')
    const [seatsPerSlot, setSeatsPerSlot] = useState(1)
    const [offerSeats, setOfferSeats] = useState(false)

    const fetchConfig = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/admin/booking-config', { headers: { aToken } })
            if (data.success && data.config) {
                setRedirectUrl(data.config.redirectUrl || '')
                setSeatsPerSlot(data.config.seatsPerSlot || 1)
                setOfferSeats(data.config.offerSeats || false)
            }
        } catch (error) {
            toast.error(error.message)
        }
    }

    const saveConfig = async () => {
        try {
            const { data } = await axios.post(
                backendUrl + '/api/admin/booking-config',
                { redirectUrl, seatsPerSlot, offerSeats },
                { headers: { aToken } }
            )
            
            if (data.success) {
                toast.success('Advanced settings saved successfully')
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
                <span className='text-2xl'>⚙️</span>
                <h2 className='text-2xl font-semibold'>Advanced</h2>
            </div>
            <p className='text-gray-600 mb-6'>Configure advanced booking options</p>

            <div className='bg-white rounded-lg shadow-sm p-6 space-y-8'>
                
                {/* Redirect on Booking */}
                <div>
                    <label className='block text-sm font-medium text-gray-700 mb-2'>
                        Redirect on booking
                    </label>
                    <p className='text-sm text-gray-500 mb-3'>
                        Redirect users to a custom URL after successful booking (optional)
                    </p>
                    <input
                        type='url'
                        value={redirectUrl}
                        onChange={(e) => setRedirectUrl(e.target.value)}
                        placeholder='https://example.com/thank-you'
                        className='w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary focus:border-transparent'
                    />
                    <p className='text-xs text-gray-400 mt-2'>
                        Leave empty to show default confirmation page
                    </p>
                </div>

                {/* Offer Seats */}
                <div className='pt-6 border-t'>
                    <div className='flex items-start gap-3 mb-4'>
                        <input
                            type='checkbox'
                            id='offerSeats'
                            checked={offerSeats}
                            onChange={(e) => setOfferSeats(e.target.checked)}
                            className='mt-1 w-5 h-5 text-primary rounded focus:ring-primary cursor-pointer'
                        />
                        <div className='flex-1'>
                            <label htmlFor='offerSeats' className='block text-sm font-medium text-gray-700 mb-1 cursor-pointer'>
                                Offer seats
                            </label>
                            <p className='text-sm text-gray-500'>
                                Enable multiple people to book the same time slot. This is useful for group sessions, webinars, or events where multiple attendees can join at the same time.
                            </p>
                        </div>
                    </div>

                    {offerSeats && (
                        <div className='mt-4 ml-8 p-4 bg-gray-50 rounded-lg border border-gray-200'>
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
                            <p className='text-sm text-gray-500 mt-2'>
                                Maximum number of people who can book each time slot
                            </p>
                        </div>
                    )}
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

export default BookingAdvanced
