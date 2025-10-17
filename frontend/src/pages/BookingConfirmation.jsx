import React, { useContext } from 'react'
import { useLocation } from 'react-router-dom'
import { AppContext } from '../context/AppContext'

const BookingConfirmation = () => {
    const { search } = useLocation()
    const params = new URLSearchParams(search)

    const docId = params.get('docId')
    const slotDate = params.get('slotDate')
    const slotTime = params.get('slotTime')
    const name = params.get('name')
    const phone = params.get('phone')
    const { doctors } = useContext(AppContext)
    const doc = doctors.find(d=>d._id === docId)

    return (
        <div className='min-h-[70vh] flex items-center justify-center p-4'>
            <div className='max-w-xl w-full bg-white rounded-lg shadow-md p-8'>
                <div className='flex flex-col items-center'>
                    <div className='confirmation-icon mb-4'>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className='w-12 h-12'>
                            <circle cx="12" cy="12" r="10" fill="#ECFDF5" />
                            <path d="M7 12l3 3 7-7" stroke="#059669" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <h2 className='text-2xl font-semibold mb-2'>This meeting is scheduled</h2>
                    <p className='text-sm text-gray-500 mb-6'>We sent an email with a calendar invitation with the details to everyone.</p>
                </div>

                <div className='divide-y'>
                    <div className='py-4 flex justify-between items-center'>
                        <div className='text-sm text-gray-500'>What</div>
                        <div className='text-sm font-medium'>Appointment</div>
                    </div>
                    <div className='py-4 flex justify-between items-center'>
                        <div className='text-sm text-gray-500'>When</div>
                        <div className='text-sm font-medium text-right'>
                            {(() => {
                                try {
                                    // support DD_MM_YYYY and ISO
                                    if (slotDate && slotDate.includes('_')) {
                                        const [dd,mm,yy] = slotDate.split('_')
                                        const d = new Date(Number(yy), Number(mm)-1, Number(dd))
                                        return `${d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} \n ${slotTime}`
                                    }
                                    const d = new Date(slotDate)
                                    if (!isNaN(d)) return `${d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} \n ${slotTime}`
                                } catch (e) {}
                                return `${slotDate} • ${slotTime}`
                            })()}
                        </div>
                    </div>
                    <div className='py-4 flex justify-between items-center'>
                        <div className='text-sm text-gray-500'>Who</div>
                        <div className='text-sm font-medium text-right'>
                            <div className='font-semibold'>{doc ? doc.name : 'Doctor'}</div>
                            <div className='mt-1'>{name} <br /> {phone}</div>
                        </div>
                    </div>
                    <div className='py-4'>
                        <div className='text-sm text-gray-600'>A calendar invite was sent. You can manage bookings from My Appointments.</div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default BookingConfirmation
