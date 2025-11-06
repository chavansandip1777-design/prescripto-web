import React from 'react'
import { useNavigate } from 'react-router-dom'
import DoctorDisplay from '../components/DoctorDisplay'

const Home = () => {
  const navigate = useNavigate()

  return (
    <div>
      {/* Hero Section */}
      <section className='bg-gradient-to-r from-blue-600 to-blue-800 text-white py-20'>
        <div className='max-w-6xl mx-auto px-4 text-center'>
          <h1 className='text-4xl md:text-6xl font-bold mb-6'>
            Book Your Appointment
          </h1>
          <p className='text-xl md:text-2xl mb-8 text-blue-100'>
            Quick and easy appointment booking system
          </p>
          <div className='space-y-4 mb-8'>
            <p className='text-lg'>📅 Monday – Friday, 10:00 AM – 5:00 PM</p>
            <p className='text-lg'>⏱️ 30-minute appointment slots</p>
            <p className='text-lg'>🕐 Book up to 12 hours in advance</p>
          </div>
          <div className='space-x-4'>
            <button
              onClick={() => navigate('/book-appointment')}
              className='bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-50 transition-colors'
            >
              Book Appointment
            </button>
            <button
              onClick={() => navigate('/cancel-appointment')}
              className='bg-transparent border-2 border-white text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors'
            >
              Cancel Appointment
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className='py-16 bg-gray-50'>
        <div className='max-w-6xl mx-auto px-4'>
          <h2 className='text-3xl font-bold text-center mb-12 text-gray-800'>
            Why Choose Our Booking System?
          </h2>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-8'>
            <div className='text-center p-6 bg-white rounded-lg shadow-sm'>
              <div className='text-4xl mb-4'>⚡</div>
              <h3 className='text-xl font-semibold mb-2'>Quick Booking</h3>
              <p className='text-gray-600'>
                Book your appointment in just a few clicks without any hassle
              </p>
            </div>
            <div className='text-center p-6 bg-white rounded-lg shadow-sm'>
              <div className='text-4xl mb-4'>📱</div>
              <h3 className='text-xl font-semibold mb-2'>Easy Cancellation</h3>
              <p className='text-gray-600'>
                Cancel or reschedule your appointment up to 12 hours in advance
              </p>
            </div>
            <div className='text-center p-6 bg-white rounded-lg shadow-sm'>
              <div className='text-4xl mb-4'>🔒</div>
              <h3 className='text-xl font-semibold mb-2'>Secure & Private</h3>
              <p className='text-gray-600'>
                Your personal information is kept secure and confidential
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className='py-16'>
        <div className='max-w-6xl mx-auto px-4'>
          <h2 className='text-3xl font-bold text-center mb-12 text-gray-800'>
            How It Works
          </h2>
          <div className='grid grid-cols-1 md:grid-cols-4 gap-8'>
            <div className='text-center'>
              <div className='bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4'>
                <span className='text-2xl font-bold text-blue-600'>1</span>
              </div>
              <h3 className='text-lg font-semibold mb-2'>Choose Date</h3>
              <p className='text-gray-600'>Select your preferred date from the calendar</p>
            </div>
            <div className='text-center'>
              <div className='bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4'>
                <span className='text-2xl font-bold text-blue-600'>2</span>
              </div>
              <h3 className='text-lg font-semibold mb-2'>Pick Time</h3>
              <p className='text-gray-600'>Choose from available 30-minute time slots</p>
            </div>
            <div className='text-center'>
              <div className='bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4'>
                <span className='text-2xl font-bold text-blue-600'>3</span>
              </div>
              <h3 className='text-lg font-semibold mb-2'>Enter Details</h3>
              <p className='text-gray-600'>Provide your name and mobile number</p>
            </div>
            <div className='text-center'>
              <div className='bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4'>
                <span className='text-2xl font-bold text-blue-600'>4</span>
              </div>
              <h3 className='text-lg font-semibold mb-2'>Confirm</h3>
              <p className='text-gray-600'>Get instant confirmation of your booking</p>
            </div>
          </div>
        </div>
      </section>

      {/* Doctor Display Section */}
      <DoctorDisplay />
    </div>
  )
}

export default Home