import React, { useEffect, useState } from 'react'
import axios from 'axios'

const DoctorDisplay = () => {
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const { data } = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/doctor/list`)
        if (data.success) {
          setDoctors(data.doctors)
        }
      } catch (error) {
        console.log('Error fetching doctors:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDoctors()
  }, [])

  if (loading) {
    return (
      <div className='text-center py-8'>
        <p className='text-gray-600'>Loading doctors...</p>
      </div>
    )
  }

  return (
    <section className='py-16 bg-gray-50'>
      <div className='max-w-6xl mx-auto px-4'>
        <div className='text-center mb-12'>
          <h2 className='text-3xl md:text-4xl font-bold text-gray-800 mb-4'>
            Our Healthcare Team
          </h2>
          <p className='text-lg text-gray-600'>
            Meet our experienced healthcare professionals
          </p>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'>
          {doctors.map((doctor, index) => (
            <div key={index} className='bg-white rounded-lg shadow-md overflow-hidden opacity-90 pointer-events-none'>
              <div className='relative'>
                <img
                  src={doctor.image}
                  alt={doctor.name}
                  className='w-full h-64 object-cover'
                />
                <div className='absolute top-2 right-2 bg-gray-500 text-white px-2 py-1 rounded text-xs'>
                  For Display Only
                </div>
              </div>
              <div className='p-6'>
                <h3 className='text-xl font-semibold text-gray-800 mb-2'>
                  {doctor.name}
                </h3>
                <p className='text-blue-600 font-medium mb-2'>
                  {doctor.speciality}
                </p>
                <p className='text-gray-600 text-sm mb-3'>
                  {doctor.degree}
                </p>
                <p className='text-gray-600 text-sm mb-3'>
                  Experience: {doctor.experience}
                </p>
                <p className='text-gray-500 text-sm line-clamp-3'>
                  {doctor.about}
                </p>
              </div>
            </div>
          ))}
        </div>

        {doctors.length === 0 && (
          <div className='text-center py-8'>
            <p className='text-gray-600'>No doctors found</p>
          </div>
        )}
      </div>
    </section>
  )
}

export default DoctorDisplay