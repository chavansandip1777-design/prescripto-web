import React, { useContext, useEffect, useState } from 'react'
import { AdminContext } from '../../context/AdminContext'
import { AppContext } from '../../context/AppContext'
import { toast } from 'react-toastify'
import axios from 'axios'

const SlotManagement = () => {
    const { aToken, backendUrl } = useContext(AdminContext)
    const { slotDateFormat } = useContext(AppContext)

    const [slots, setSlots] = useState([])
    const [isLoading, setIsLoading] = useState(false)
    const [filterDate, setFilterDate] = useState('')
    const [showBulkCreate, setShowBulkCreate] = useState(false)
    const [showCreateSlot, setShowCreateSlot] = useState(false)

    // Single slot creation
    const [newSlot, setNewSlot] = useState({
        date: '',
        time: '',
        maxSeats: 1
    })

    // Generate time slot options
    const generateTimeOptions = () => {
        const times = []
        for (let hour = 0; hour < 24; hour++) {
            for (let min of [0, 30]) {
                const h = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
                const period = hour >= 12 ? 'PM' : 'AM'
                const time = `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')} ${period}`
                times.push(time)
            }
        }
        return times
    }

    // Bulk slot creation
    const [bulkSlots, setBulkSlots] = useState({
        startDate: '',
        endDate: '',
        startTime: '10:00',
        endTime: '17:00',
        slotDuration: 30,
        maxSeats: 1
    })

    // Fetch all slots
    const fetchSlots = async (date = '') => {
        try {
            setIsLoading(true)
            const url = date
                ? `${backendUrl}/api/admin/slots?date=${date}`
                : `${backendUrl}/api/admin/slots`

            const { data } = await axios.get(url, { headers: { aToken } })

            if (data.success) {
                setSlots(data.slots)
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            console.error(error)
            toast.error('Failed to fetch slots')
        } finally {
            setIsLoading(false)
        }
    }

    // Create single slot
    const createSlot = async () => {
        try {
            if (!newSlot.date || !newSlot.time) {
                return toast.error('Date and time are required')
            }

            const { data } = await axios.post(
                `${backendUrl}/api/admin/create-slot`,
                newSlot,
                { headers: { aToken } }
            )

            if (data.success) {
                toast.success(data.message)
                setNewSlot({ date: '', time: '', maxSeats: 1 })
                setShowCreateSlot(false)
                fetchSlots(filterDate)
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            console.error(error)
            toast.error('Failed to create slot')
        }
    }

    // Bulk create slots
    const bulkCreateSlots = async () => {
        try {
            if (!bulkSlots.startDate || !bulkSlots.endDate) {
                return toast.error('Start and end dates are required')
            }

            setIsLoading(true)
            const { data } = await axios.post(
                `${backendUrl}/api/admin/bulk-create-slots`,
                bulkSlots,
                { headers: { aToken } }
            )

            if (data.success) {
                toast.success(data.message)
                setShowBulkCreate(false)
                fetchSlots(filterDate)
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            console.error(error)
            toast.error('Failed to bulk create slots')
        } finally {
            setIsLoading(false)
        }
    }

    // Toggle slot enable/disable
    const toggleSlot = async (slotId, currentStatus) => {
        try {
            const { data } = await axios.post(
                `${backendUrl}/api/admin/update-slot`,
                { slotId, isEnabled: !currentStatus },
                { headers: { aToken } }
            )

            if (data.success) {
                toast.success(data.message)
                fetchSlots(filterDate)
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            console.error(error)
            toast.error('Failed to update slot')
        }
    }

    // Update slot seats
    const updateSlotSeats = async (slotId, currentSeats) => {
        const newSeats = prompt(`Enter new maximum seats (current: ${currentSeats}):`, currentSeats)

        if (newSeats === null) return

        const seats = parseInt(newSeats)
        if (isNaN(seats) || seats < 1) {
            return toast.error('Please enter a valid number')
        }

        try {
            const { data } = await axios.post(
                `${backendUrl}/api/admin/update-slot`,
                { slotId, maxSeats: seats },
                { headers: { aToken } }
            )

            if (data.success) {
                toast.success(data.message)
                fetchSlots(filterDate)
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            console.error(error)
            toast.error('Failed to update slot')
        }
    }

    // Delete slot
    const deleteSlot = async (slotId) => {
        if (!confirm('Are you sure you want to delete this slot?')) return

        try {
            const { data } = await axios.post(
                `${backendUrl}/api/admin/delete-slot`,
                { slotId },
                { headers: { aToken } }
            )

            if (data.success) {
                toast.success(data.message)
                fetchSlots(filterDate)
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            console.error(error)
            toast.error('Failed to delete slot')
        }
    }

    // Convert date from DD_MM_YYYY to YYYY-MM-DD for input
    const convertToInputDate = (dateStr) => {
        if (!dateStr) return ''
        const [day, month, year] = dateStr.split('_')
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    }

    // Convert date from YYYY-MM-DD to DD_MM_YYYY for API
    const convertToApiDate = (dateStr) => {
        if (!dateStr) return ''
        const [year, month, day] = dateStr.split('-')
        return `${day}_${month}_${year}`
    }

    useEffect(() => {
        if (aToken) {
            fetchSlots()
        }
    }, [aToken])

    return (
        <div className='m-5 w-full max-w-6xl'>
            <div className='flex items-center justify-between mb-5'>
                <h1 className='text-2xl font-semibold'>Slot Management</h1>
                <div className='flex gap-2'>
                    <button
                        onClick={() => setShowCreateSlot(true)}
                        className='bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700'
                    >
                        + Create Slot
                    </button>
                    <button
                        onClick={() => setShowBulkCreate(true)}
                        className='bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700'
                    >
                        📅 Bulk Create
                    </button>
                </div>
            </div>

            {/* Filter */}
            <div className='mb-4 flex gap-3 items-center'>
                <label className='font-medium'>Filter by Date:</label>
                <input
                    type='date'
                    value={filterDate ? convertToInputDate(filterDate) : ''}
                    onChange={(e) => {
                        const apiDate = convertToApiDate(e.target.value)
                        setFilterDate(apiDate)
                        fetchSlots(apiDate)
                    }}
                    className='px-3 py-2 border rounded-md'
                />
                <button
                    onClick={() => {
                        setFilterDate('')
                        fetchSlots()
                    }}
                    className='px-3 py-2 bg-gray-200 rounded-md hover:bg-gray-300'
                >
                    Clear
                </button>
            </div>

            {/* Slots Table */}
            <div className='bg-white border rounded-lg overflow-hidden'>
                <div className='overflow-x-auto max-h-[600px]'>
                    <table className='w-full'>
                        <thead className='bg-gray-100 sticky top-0'>
                            <tr>
                                <th className='px-4 py-3 text-left'>Date</th>
                                <th className='px-4 py-3 text-left'>Time</th>
                                <th className='px-4 py-3 text-center'>Max Seats</th>
                                <th className='px-4 py-3 text-center'>Booked</th>
                                <th className='px-4 py-3 text-center'>Available</th>
                                <th className='px-4 py-3 text-center'>Status</th>
                                <th className='px-4 py-3 text-center'>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan='7' className='text-center py-10'>
                                        Loading...
                                    </td>
                                </tr>
                            ) : slots.length === 0 ? (
                                <tr>
                                    <td colSpan='7' className='text-center py-10 text-gray-500'>
                                        No slots found. Create some slots to get started.
                                    </td>
                                </tr>
                            ) : (
                                slots.map((slot, index) => (
                                    <tr key={slot._id} className='border-t hover:bg-gray-50'>
                                        <td className='px-4 py-3'>{slotDateFormat(slot.date)}</td>
                                        <td className='px-4 py-3 font-medium'>{slot.time}</td>
                                        <td className='px-4 py-3 text-center'>
                                            <button
                                                onClick={() => updateSlotSeats(slot._id, slot.maxSeats)}
                                                className='text-blue-600 hover:underline'
                                            >
                                                {slot.maxSeats}
                                            </button>
                                        </td>
                                        <td className='px-4 py-3 text-center'>
                                            <span className='text-red-600 font-semibold'>{slot.bookedSeats}</span>
                                        </td>
                                        <td className='px-4 py-3 text-center'>
                                            <span className='text-green-600 font-semibold'>{slot.availableSeats}</span>
                                        </td>
                                        <td className='px-4 py-3 text-center'>
                                            <span
                                                className={`px-2 py-1 rounded-full text-xs font-medium ${slot.isEnabled
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-red-100 text-red-700'
                                                    }`}
                                            >
                                                {slot.isEnabled ? 'Enabled' : 'Disabled'}
                                            </span>
                                        </td>
                                        <td className='px-4 py-3 text-center'>
                                            <div className='flex gap-2 justify-center'>
                                                <button
                                                    onClick={() => toggleSlot(slot._id, slot.isEnabled)}
                                                    className={`px-3 py-1 rounded text-sm ${slot.isEnabled
                                                            ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                                                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                                                        }`}
                                                >
                                                    {slot.isEnabled ? 'Disable' : 'Enable'}
                                                </button>
                                                <button
                                                    onClick={() => deleteSlot(slot._id)}
                                                    className='px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200'
                                                    disabled={slot.bookedSeats > 0}
                                                    title={slot.bookedSeats > 0 ? 'Cannot delete slot with bookings' : 'Delete slot'}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Single Slot Modal */}
            {showCreateSlot && (
                <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
                    <div className='bg-white rounded-lg p-6 w-full max-w-md'>
                        <h2 className='text-xl font-semibold mb-4'>Create New Slot</h2>
                        <div className='space-y-4'>
                            <div>
                                <label className='block text-sm font-medium mb-1'>Date</label>
                                <input
                                    type='date'
                                    value={newSlot.date ? convertToInputDate(newSlot.date) : ''}
                                    onChange={(e) => setNewSlot({ ...newSlot, date: convertToApiDate(e.target.value) })}
                                    className='w-full px-3 py-2 border rounded-md'
                                />
                            </div>
                            <div>
                                <label className='block text-sm font-medium mb-1'>Time</label>
                                <select
                                    value={newSlot.time}
                                    onChange={(e) => setNewSlot({ ...newSlot, time: e.target.value })}
                                    className='w-full px-3 py-2 border rounded-md'
                                >
                                    <option value=''>Select time</option>
                                    {generateTimeOptions().map(time => (
                                        <option key={time} value={time}>{time}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className='block text-sm font-medium mb-1'>Maximum Seats</label>
                                <input
                                    type='number'
                                    min='1'
                                    value={newSlot.maxSeats}
                                    onChange={(e) => setNewSlot({ ...newSlot, maxSeats: parseInt(e.target.value) })}
                                    className='w-full px-3 py-2 border rounded-md'
                                />
                            </div>
                        </div>
                        <div className='flex gap-3 mt-6'>
                            <button
                                onClick={() => setShowCreateSlot(false)}
                                className='flex-1 px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300'
                            >
                                Cancel
                            </button>
                            <button
                                onClick={createSlot}
                                className='flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700'
                            >
                                Create
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Create Modal */}
            {showBulkCreate && (
                <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
                    <div className='bg-white rounded-lg p-6 w-full max-w-md'>
                        <h2 className='text-xl font-semibold mb-4'>Bulk Create Slots</h2>
                        <div className='space-y-4'>
                            <div className='grid grid-cols-2 gap-3'>
                                <div>
                                    <label className='block text-sm font-medium mb-1'>Start Date</label>
                                    <input
                                        type='date'
                                        value={bulkSlots.startDate ? convertToInputDate(bulkSlots.startDate) : ''}
                                        onChange={(e) => setBulkSlots({ ...bulkSlots, startDate: convertToApiDate(e.target.value) })}
                                        className='w-full px-3 py-2 border rounded-md'
                                    />
                                </div>
                                <div>
                                    <label className='block text-sm font-medium mb-1'>End Date</label>
                                    <input
                                        type='date'
                                        value={bulkSlots.endDate ? convertToInputDate(bulkSlots.endDate) : ''}
                                        onChange={(e) => setBulkSlots({ ...bulkSlots, endDate: convertToApiDate(e.target.value) })}
                                        className='w-full px-3 py-2 border rounded-md'
                                    />
                                </div>
                            </div>
                            <div className='grid grid-cols-2 gap-3'>
                                <div>
                                    <label className='block text-sm font-medium mb-1'>Start Time (24h)</label>
                                    <input
                                        type='time'
                                        value={bulkSlots.startTime}
                                        onChange={(e) => setBulkSlots({ ...bulkSlots, startTime: e.target.value })}
                                        className='w-full px-3 py-2 border rounded-md'
                                    />
                                </div>
                                <div>
                                    <label className='block text-sm font-medium mb-1'>End Time (24h)</label>
                                    <input
                                        type='time'
                                        value={bulkSlots.endTime}
                                        onChange={(e) => setBulkSlots({ ...bulkSlots, endTime: e.target.value })}
                                        className='w-full px-3 py-2 border rounded-md'
                                    />
                                </div>
                            </div>
                            <div>
                                <label className='block text-sm font-medium mb-1'>Slot Duration (minutes)</label>
                                <select
                                    value={bulkSlots.slotDuration}
                                    onChange={(e) => setBulkSlots({ ...bulkSlots, slotDuration: parseInt(e.target.value) })}
                                    className='w-full px-3 py-2 border rounded-md'
                                >
                                    <option value={15}>15 minutes</option>
                                    <option value={30}>30 minutes</option>
                                    <option value={45}>45 minutes</option>
                                    <option value={60}>60 minutes</option>
                                </select>
                            </div>
                            <div>
                                <label className='block text-sm font-medium mb-1'>Maximum Seats per Slot</label>
                                <input
                                    type='number'
                                    min='1'
                                    value={bulkSlots.maxSeats}
                                    onChange={(e) => setBulkSlots({ ...bulkSlots, maxSeats: parseInt(e.target.value) })}
                                    className='w-full px-3 py-2 border rounded-md'
                                />
                            </div>
                            <div className='text-xs text-gray-600 bg-blue-50 p-3 rounded'>
                                ℹ️ This will create slots for weekdays only (Mon-Fri), excluding holidays.
                            </div>
                        </div>
                        <div className='flex gap-3 mt-6'>
                            <button
                                onClick={() => setShowBulkCreate(false)}
                                className='flex-1 px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300'
                                disabled={isLoading}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={bulkCreateSlots}
                                className='flex-1 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700'
                                disabled={isLoading}
                            >
                                {isLoading ? 'Creating...' : 'Create Slots'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default SlotManagement
