import React, { useContext, useState } from 'react'
import { AppContext } from '../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'

const CancelAppointment = () => {
    const { backendUrl } = useContext(AppContext)
    
    const [formData, setFormData] = useState({
        patientName: '',
        patientMobile: '',
        slotDate: '',
        slotTime: ''
    })
    const [appointments, setAppointments] = useState([])
    const [isSearching, setIsSearching] = useState(false)
    const [isCancelling, setIsCancelling] = useState(false)
    const [showAppointments, setShowAppointments] = useState(false)

    // Helper function to format date for display
    const formatDisplayDate = (dateStr) => {
        try {
            const [day, month, year] = dateStr.split('_')
            const date = new Date(year, month - 1, day)
            return date.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })
        } catch (error) {
            return dateStr
        }
    }

    // Search for appointments
    const searchAppointments = async () => {
        if (!formData.patientName || !formData.patientMobile) {
            toast.warning('Please enter your name and mobile number')
            return
        }

        if (!/^\d{10}$/.test(formData.patientMobile)) {
            toast.warning('Please enter a valid 10-digit mobile number')
            return
        }

        try {
            setIsSearching(true)
            
            const { data } = await axios.get(backendUrl + '/api/booking/user-appointments', {
                params: {
                    patientName: formData.patientName,
                    patientMobile: formData.patientMobile
                }
            })

            if (data.success) {
                setAppointments(data.appointments)
                setShowAppointments(true)
                
                if (data.appointments.length === 0) {
                    toast.info('No appointments found with the provided details')
                }
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            console.log(error)
            toast.error('Failed to search appointments')
        } finally {
            setIsSearching(false)
        }
    }

    // Cancel appointment
    const cancelAppointment = async (appointment) => {
        try {
            setIsCancelling(true)
            
            const { data } = await axios.post(backendUrl + '/api/booking/cancel', {
                patientName: appointment.patientName,
                patientMobile: appointment.patientMobile,
                slotDate: appointment.slotDate,
                slotTime: appointment.slotTime
            })

            if (data.success) {
                toast.success(data.message)
                // Refresh appointments list
                searchAppointments()
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            console.log(error)
            toast.error('Failed to cancel appointment')
        } finally {
            setIsCancelling(false)
        }
    }

    // Check if cancellation is allowed (within 12 hours)
    const canCancel = (appointment) => {
        const now = new Date()
        return now < new Date(appointment.cancellationDeadline)
    }

    return (
        <div className='max-w-4xl mx-auto p-4'>
            <div className='text-center mb-8'>
                <h1 className='text-3xl font-bold text-gray-800 mb-2'>Cancel Appointment</h1>
                <p className='text-gray-600'>
                    Enter your details to find and cancel your appointment
                </p>
                <div className='mt-4 bg-yellow-50 p-4 rounded-lg'>
                    <p className='text-sm text-yellow-800'>
                        <strong>Note:</strong> Appointments can only be cancelled up to 12 hours before the scheduled time.
                    </p>
                </div>
            </div>

            {/* Search Form */}
            <div className='bg-white rounded-lg shadow-sm p-6 mb-6'>
                <h2 className='text-xl font-semibold mb-4'>Find Your Appointment</h2>
                
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-4'>
                    <div>
                        <label className='block text-sm font-medium text-gray-700 mb-1'>
                            Full Name *
                        </label>
                        <input
                            type='text'
                            value={formData.patientName}
                            onChange={(e) => setFormData({...formData, patientName: e.target.value})}
                            placeholder='Enter your full name'
                            className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
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
                            value={formData.patientMobile}
                            onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, '').slice(0, 10)
                                setFormData({...formData, patientMobile: value})
                            }}
                            placeholder='10-digit mobile number'
                            className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                        />
                    </div>
                </div>
                
                <button
                    onClick={searchAppointments}
                    disabled={isSearching}
                    className='bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50'
                >
                    {isSearching ? 'Searching...' : 'Find Appointments'}
                </button>
            </div>

            {/* Appointments List */}
            {showAppointments && (
                <div className='bg-white rounded-lg shadow-sm'>
                    <div className='p-6 border-b'>
                        <h2 className='text-xl font-semibold'>Your Appointments</h2>
                    </div>
                    
                    {appointments.length === 0 ? (
                        <div className='p-6 text-center text-gray-500'>
                            No appointments found
                        </div>
                    ) : (
                        <div className='divide-y divide-gray-200'>
                            {appointments.map((appointment) => (
                                <div key={appointment._id} className='p-6'>
                                    <div className='flex flex-col md:flex-row md:items-center md:justify-between'>
                                        <div className='flex-1'>
                                            <div className='flex items-center mb-2'>
                                                <div className='text-lg font-semibold text-gray-900'>
                                                    {formatDisplayDate(appointment.slotDate)}
                                                </div>
                                                <div className='ml-4 text-lg font-semibold text-blue-600'>
                                                    {appointment.slotTime}
                                                </div>
                                            </div>
                                            
                                            <div className='text-sm text-gray-600 space-y-1'>
                                                <p><strong>Name:</strong> {appointment.patientName}</p>
                                                <p><strong>Mobile:</strong> {appointment.patientMobile}</p>
                                                <p><strong>Booked on:</strong> {new Date(appointment.date).toLocaleDateString()}</p>
                                                
                                                {appointment.cancellationDeadline && (
                                                    <p><strong>Cancel by:</strong> {new Date(appointment.cancellationDeadline).toLocaleString()}</p>
                                                )}
                                            </div>
                                            
                                            {appointment.cancelled && (
                                                <div className='mt-2'>
                                                    <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800'>
                                                        Cancelled
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className='mt-4 md:mt-0 md:ml-6'>
                                            {!appointment.cancelled && canCancel(appointment) ? (
                                                <button
                                                    onClick={() => cancelAppointment(appointment)}
                                                    disabled={isCancelling}
                                                    className='bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50'
                                                >
                                                    {isCancelling ? 'Cancelling...' : 'Cancel Appointment'}
                                                </button>
                                            ) : !appointment.cancelled ? (
                                                <div className='text-sm text-gray-500'>
                                                    Cancellation window expired
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default CancelAppointment