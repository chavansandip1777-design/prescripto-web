import React, { useContext, useEffect, useState } from 'react'
import { AdminContext } from '../../context/AdminContext'
import { AppContext } from '../../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'

const HolidayManagement = () => {
    const { backendUrl } = useContext(AppContext)
    const { aToken } = useContext(AdminContext)
    
    const [holidays, setHolidays] = useState([])
    const [newHoliday, setNewHoliday] = useState({
        date: '',
        name: '',
        isRecurring: false
    })
    const [loading, setLoading] = useState(false)

    // Get all holidays
    const getHolidays = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/admin/holidays', {
                headers: { aToken }
            })
            if (data.success) {
                setHolidays(data.holidays)
            }
        } catch (error) {
            console.log(error)
            toast.error('Failed to fetch holidays')
        }
    }

    // Add new holiday
    const addHoliday = async (e) => {
        e.preventDefault()
        
        if (!newHoliday.date || !newHoliday.name) {
            toast.error('Date and name are required')
            return
        }

        try {
            setLoading(true)
            
            // Convert date to DD_MM_YYYY format
            const date = new Date(newHoliday.date)
            const formattedDate = `${String(date.getDate()).padStart(2, '0')}_${String(date.getMonth() + 1).padStart(2, '0')}_${date.getFullYear()}`
            
            const { data } = await axios.post(backendUrl + '/api/admin/add-holiday', {
                date: formattedDate,
                name: newHoliday.name,
                isRecurring: newHoliday.isRecurring
            }, {
                headers: { aToken }
            })

            if (data.success) {
                toast.success(data.message)
                setNewHoliday({ date: '', name: '', isRecurring: false })
                getHolidays()
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            console.log(error)
            toast.error('Failed to add holiday')
        } finally {
            setLoading(false)
        }
    }

    // Remove holiday
    const removeHoliday = async (holidayId) => {
        try {
            const { data } = await axios.post(backendUrl + '/api/admin/remove-holiday', {
                holidayId
            }, {
                headers: { aToken }
            })

            if (data.success) {
                toast.success(data.message)
                getHolidays()
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            console.log(error)
            toast.error('Failed to remove holiday')
        }
    }

    // Format date for display
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

    useEffect(() => {
        if (aToken) {
            getHolidays()
        }
    }, [aToken])

    return (
        <div className='m-5 max-w-4xl'>
            <h1 className='text-2xl font-medium mb-6'>Holiday Management</h1>
            
            {/* Add Holiday Form */}
            <div className='bg-white p-6 rounded-lg shadow-sm mb-6'>
                <h2 className='text-lg font-medium mb-4'>Add New Holiday</h2>
                <form onSubmit={addHoliday} className='space-y-4'>
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                        <div>
                            <label className='block text-sm font-medium text-gray-700 mb-1'>
                                Date
                            </label>
                            <input
                                type='date'
                                value={newHoliday.date}
                                onChange={(e) => setNewHoliday({...newHoliday, date: e.target.value})}
                                className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                                required
                            />
                        </div>
                        <div>
                            <label className='block text-sm font-medium text-gray-700 mb-1'>
                                Holiday Name
                            </label>
                            <input
                                type='text'
                                value={newHoliday.name}
                                onChange={(e) => setNewHoliday({...newHoliday, name: e.target.value})}
                                placeholder='e.g., Christmas, New Year'
                                className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                                required
                            />
                        </div>
                    </div>
                    <div className='flex items-center'>
                        <input
                            type='checkbox'
                            checked={newHoliday.isRecurring}
                            onChange={(e) => setNewHoliday({...newHoliday, isRecurring: e.target.checked})}
                            className='mr-2'
                        />
                        <label className='text-sm text-gray-700'>
                            Recurring holiday (repeats every year)
                        </label>
                    </div>
                    <button
                        type='submit'
                        disabled={loading}
                        className='bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50'
                    >
                        {loading ? 'Adding...' : 'Add Holiday'}
                    </button>
                </form>
            </div>

            {/* Holidays List */}
            <div className='bg-white rounded-lg shadow-sm'>
                <div className='p-6 border-b'>
                    <h2 className='text-lg font-medium'>Existing Holidays</h2>
                </div>
                
                {holidays.length === 0 ? (
                    <div className='p-6 text-center text-gray-500'>
                        No holidays configured
                    </div>
                ) : (
                    <div className='overflow-x-auto'>
                        <table className='w-full'>
                            <thead className='bg-gray-50'>
                                <tr>
                                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                                        Date
                                    </th>
                                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                                        Name
                                    </th>
                                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                                        Type
                                    </th>
                                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className='bg-white divide-y divide-gray-200'>
                                {holidays.map((holiday) => (
                                    <tr key={holiday._id}>
                                        <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900'>
                                            {formatDisplayDate(holiday.date)}
                                        </td>
                                        <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900'>
                                            {holiday.name}
                                        </td>
                                        <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                                            {holiday.isRecurring ? (
                                                <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800'>
                                                    Recurring
                                                </span>
                                            ) : (
                                                <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800'>
                                                    One-time
                                                </span>
                                            )}
                                        </td>
                                        <td className='px-6 py-4 whitespace-nowrap text-sm font-medium'>
                                            <button
                                                onClick={() => removeHoliday(holiday._id)}
                                                className='text-red-600 hover:text-red-900'
                                            >
                                                Remove
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}

export default HolidayManagement