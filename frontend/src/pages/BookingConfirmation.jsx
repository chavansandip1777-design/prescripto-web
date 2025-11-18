import React from 'react'
import { useNavigate } from 'react-router-dom'

const BookingConfirmation = () => {
    const navigate = useNavigate()

    // Get booking details from sessionStorage
    let booking = null
    try {
        const raw = sessionStorage.getItem('last_booking')
        if (raw) {
            booking = JSON.parse(raw)
        }
    } catch (e) {
        console.error('Failed to parse booking data')
    }

    if (!booking) {
        return (
            <div className='min-h-screen bg-gray-50 flex items-center justify-center p-4'>
                <div className='max-w-xl w-full bg-white rounded-lg shadow-sm p-8 text-center'>
                    <h2 className='text-2xl font-semibold mb-4'>No booking found</h2>
                    <button 
                        onClick={() => navigate('/book-appointment')}
                        className='px-6 py-2 bg-black text-white rounded-md hover:bg-gray-800'
                    >
                        Book an appointment
                    </button>
                </div>
            </div>
        )
    }

    const formatDate = (dateStr) => {
        try {
            if (dateStr && dateStr.includes('_')) {
                const [dd, mm, yy] = dateStr.split('_')
                const d = new Date(Number(yy), Number(mm) - 1, Number(dd))
                return d.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'long', 
                    day: 'numeric', 
                    year: 'numeric' 
                })
            }
            const d = new Date(dateStr)
            if (!isNaN(d)) {
                return d.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'long', 
                    day: 'numeric', 
                    year: 'numeric' 
                })
            }
        } catch (e) {}
        return dateStr
    }

    return (
        <div className='min-h-screen bg-gray-50 flex items-center justify-center p-4'>
            <div className='max-w-2xl w-full bg-white rounded-lg shadow-sm p-8'>
                {/* Success Icon */}
                <div className='flex flex-col items-center mb-8'>
                    <div className='w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4'>
                        <svg className='w-8 h-8 text-green-600' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 13l4 4L19 7' />
                        </svg>
                    </div>
                    <h1 className='text-3xl font-bold text-gray-900 mb-2'>This meeting is scheduled</h1>
                    <p className='text-gray-600 text-center max-w-md'>
                        We sent an email with a calendar invitation with the details to everyone.
                    </p>
                </div>

                {/* Meeting Details */}
                <div className='border border-gray-200 rounded-lg divide-y divide-gray-200'>
                    <div className='p-6'>
                        <div className='flex items-center gap-3 mb-4'>
                            <div className='w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center text-white text-2xl'>
                                🏥
                            </div>
                            <div>
                                <h3 className='font-semibold text-lg'>Doctor Appointment</h3>
                                <p className='text-sm text-gray-600'>Medical Consultation</p>
                            </div>
                        </div>
                    </div>

                    <div className='p-6 space-y-4'>
                        <div className='flex items-start gap-4'>
                            <div className='w-24 text-sm text-gray-600 font-medium'>What</div>
                            <div className='flex-1 text-sm text-gray-900'>
                                Medical Consultation - Professional appointment
                            </div>
                        </div>

                        <div className='flex items-start gap-4'>
                            <div className='w-24 text-sm text-gray-600 font-medium'>When</div>
                            <div className='flex-1'>
                                <div className='text-sm text-gray-900 font-medium'>
                                    {formatDate(booking.slotDate)}
                                </div>
                                <div className='text-sm text-gray-600 mt-1'>
                                    {booking.slotTime} - 30 minutes
                                </div>
                                <div className='text-sm text-gray-600'>
                                    India Standard Time (IST)
                                </div>
                            </div>
                        </div>

                        <div className='flex items-start gap-4'>
                            <div className='w-24 text-sm text-gray-600 font-medium'>Who</div>
                            <div className='flex-1'>
                                <div className='text-sm text-gray-900 font-medium'>Patient Details</div>
                                <div className='text-sm text-gray-600 mt-1'>
                                    {booking.name}
                                </div>
                                <div className='text-sm text-gray-600'>
                                    {booking.email}
                                </div>
                            </div>
                        </div>

                        <div className='flex items-start gap-4'>
                            <div className='w-24 text-sm text-gray-600 font-medium'>Where</div>
                            <div className='flex-1 text-sm text-gray-900'>
                                {booking.address || 'In Person (Attendee Address)'}
                            </div>
                        </div>

                        {booking.notes && (
                            <div className='flex items-start gap-4'>
                                <div className='w-24 text-sm text-gray-600 font-medium'>Notes</div>
                                <div className='flex-1 text-sm text-gray-700'>
                                    {booking.notes}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className='mt-6 flex gap-3'>
                    <button
                        onClick={() => navigate('/book-appointment')}
                        className='flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 font-medium'
                    >
                        Book Another
                    </button>
                    <button
                        onClick={() => navigate('/cancel-appointment')}
                        className='flex-1 px-6 py-3 bg-red-50 text-red-600 rounded-md hover:bg-red-100 font-medium'
                    >
                        Cancel Booking
                    </button>
                </div>

            </div>
        </div>
    )
}

export default BookingConfirmation
