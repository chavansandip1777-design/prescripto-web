import React, { useEffect } from 'react'
import { assets } from '../../assets/assets'
import { useContext } from 'react'
import { AdminContext } from '../../context/AdminContext'
import { AppContext } from '../../context/AppContext'

const AllAppointments = () => {

  const { aToken, appointments, cancelAppointment, getAllAppointments } = useContext(AdminContext)
  const { slotDateFormat, calculateAge, currency } = useContext(AppContext)

  useEffect(() => {
    if (aToken) {
      getAllAppointments()
    }
  }, [aToken])

  return (
    <div className='w-full max-w-6xl m-5 '>

      <p className='mb-3 text-lg font-medium'>All Appointments</p>

      <div className='bg-white border rounded text-sm max-h-[80vh] overflow-y-scroll'>
        <div className='hidden sm:grid grid-cols-[0.5fr_3fr_1fr_3fr_2fr_1fr] grid-flow-col py-3 px-6 border-b'>
          <p>#</p>
          <p>Patient</p>
          <p>Mobile</p>
          <p>Date & Time</p>
          <p>Status</p>
          <p>Action</p>
        </div>
        {appointments.map((item, index) => {
          // Handle both new and old appointment structures
          const patientName = item.patientName || item.userData?.name || 'Anonymous'
          const patientMobile = item.patientMobile || item.userData?.phone || 'N/A'
          const isOldStructure = item.docData || item.userData
          
          return (
            <div className='flex flex-wrap justify-between max-sm:gap-2 sm:grid sm:grid-cols-[0.5fr_3fr_1fr_3fr_2fr_1fr] items-center text-gray-500 py-3 px-6 border-b hover:bg-gray-50' key={index}>
              <p className='max-sm:hidden'>{index+1}</p>
              <div className='flex items-center gap-2'>
                <div className='rounded-full w-8 h-8 bg-blue-100 flex items-center justify-center'>
                  <span className='text-blue-600 font-semibold text-sm'>
                    {patientName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p>{patientName}</p>
                  {isOldStructure && (
                    <p className='text-xs text-orange-500'>(Legacy booking)</p>
                  )}
                </div>
              </div>
              <p className='max-sm:hidden'>{patientMobile}</p>
              <p>{slotDateFormat(item.slotDate)}, {item.slotTime}</p>
              <div className='flex items-center gap-2'>
                {item.cancelled ? (
                  <span className='px-2 py-1 bg-red-100 text-red-600 rounded text-xs font-medium'>Cancelled</span>
                ) : item.isCompleted ? (
                  <span className='px-2 py-1 bg-green-100 text-green-600 rounded text-xs font-medium'>Completed</span>
                ) : (
                  <span className='px-2 py-1 bg-blue-100 text-blue-600 rounded text-xs font-medium'>Scheduled</span>
                )}
              </div>
              {item.cancelled ? 
                <p className='text-red-400 text-xs font-medium'>Cancelled</p> : 
                item.isCompleted ? 
                <p className='text-green-500 text-xs font-medium'>Completed</p> : 
                <img onClick={() => cancelAppointment(item._id)} className='w-10 cursor-pointer' src={assets.cancel_icon} alt="" />
              }
            </div>
          )
        })}
      </div>

    </div>
  )
}

export default AllAppointments