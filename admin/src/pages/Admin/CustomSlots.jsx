import React, { useEffect, useState, useContext } from 'react'
import axios from 'axios'
import { AdminContext } from '../../context/AdminContext'
import { toast } from 'react-toastify'

const CustomSlots = () => {
    const { aToken } = useContext(AdminContext)
    const backendUrl = import.meta.env.VITE_BACKEND_URL

    const [selectedDate, setSelectedDate] = useState('')
    const [slots, setSlots] = useState([])
    const [dayInfo, setDayInfo] = useState(null)
    const [loading, setLoading] = useState(false)
    const [availableTimes, setAvailableTimes] = useState([]) // For dropdown options
    
    // Add slot form
    const [showAddForm, setShowAddForm] = useState(false)
    const [newSlot, setNewSlot] = useState({
        time: '',
        maxSeats: 1,
        notes: ''
    })

    // Fetch slots for selected date
    const fetchSlots = async (date) => {
        try {
            setLoading(true)
            console.log('[fetchSlots] Fetching slots for date:', date)
            const { data } = await axios.get(backendUrl + `/api/admin/custom-slots?date=${date}`, { 
                headers: { aToken } 
            })
            
            console.log('[fetchSlots] Response:', data)
            console.log('[fetchSlots] Slots count:', data.slots?.length || 0)
            
            if (data.success) {
                setSlots(data.slots)
                setDayInfo(data.info)
                // Generate time options (every 30 minutes from 00:00 to 23:30)
                generateTimeOptions()
                console.log('[fetchSlots] Slots state updated with', data.slots.length, 'slots')
            } else {
                console.error('[fetchSlots] API returned success:false -', data.message)
                toast.error(data.message)
            }
        } catch (error) {
            console.error('[fetchSlots] Error:', error)
            toast.error(error.message)
        } finally {
            setLoading(false)
        }
    }

    // Generate time dropdown options
    const generateTimeOptions = () => {
        const times = []
        for (let hour = 0; hour < 24; hour++) {
            for (let min = 0; min < 60; min += 30) {
                let displayHour = hour
                const period = hour >= 12 ? 'PM' : 'AM'
                if (displayHour === 0) displayHour = 12
                else if (displayHour > 12) displayHour -= 12
                
                const timeStr = `${String(displayHour).padStart(2, '0')}:${String(min).padStart(2, '0')} ${period}`
                times.push(timeStr)
            }
        }
        setAvailableTimes(times)
    }

    // Add new custom slot
    const handleAddSlot = async () => {
        try {
            if (!newSlot.time) {
                toast.error('Time is required')
                return
            }

            // Convert YYYY-MM-DD to DD_MM_YYYY
            const [year, month, day] = selectedDate.split('-')
            const formattedDate = `${day}_${month}_${year}`
            console.log('[handleAddSlot] Adding slot for date:', formattedDate, 'time:', newSlot.time)

            const { data } = await axios.post(
                backendUrl + '/api/admin/custom-slots/add',
                {
                    date: formattedDate,
                    time: newSlot.time,
                    maxSeats: newSlot.maxSeats,
                    notes: newSlot.notes
                },
                { headers: { aToken } }
            )
            
            console.log('[handleAddSlot] Response:', data)
            if (data.success) {
                toast.success('Custom slot added successfully')
                setShowAddForm(false)
                setNewSlot({ time: '', maxSeats: 1, notes: '' })
                console.log('[handleAddSlot] Refreshing slots...')
                fetchSlots(formattedDate)
            } else {
                console.error('[handleAddSlot] API returned success:false -', data.message)
                toast.error(data.message)
            }
        } catch (error) {
            console.error('[handleAddSlot] Error:', error)
            toast.error(error.message)
        }
    }

    // Toggle slot enabled/disabled
    const toggleSlot = async (slot, currentStatus) => {
        try {
            console.log('[toggleSlot] Toggling slot:', slot.time, 'current status:', currentStatus)
            const payload = {
                enabled: !currentStatus,
                date: selectedDate.split('-').reverse().join('_'),
                time: slot.time
            }
            
            // If slot has an ID, include it
            if (slot._id) {
                payload.slotId = slot._id
            }

            console.log('[toggleSlot] Payload:', payload)
            const { data } = await axios.post(
                backendUrl + `/api/admin/custom-slots/update`,
                payload,
                { headers: { aToken } }
            )
            
            console.log('[toggleSlot] Response:', data)
            if (data.success) {
                toast.success(`Slot ${!currentStatus ? 'enabled' : 'disabled'}`)
                fetchSlots(selectedDate.split('-').reverse().join('_'))
            } else {
                console.error('[toggleSlot] API returned success:false -', data.message)
                toast.error(data.message)
            }
        } catch (error) {
            console.error('[toggleSlot] Error:', error)
            toast.error(error.message)
        }
    }

    // Update slot seats
    const updateSlotSeats = async (slot, newSeats) => {
        try {
            console.log('[updateSlotSeats] Updating slot:', slot.time, 'to seats:', newSeats)
            const payload = {
                maxSeats: parseInt(newSeats),
                date: selectedDate.split('-').reverse().join('_'),
                time: slot.time
            }
            
            if (slot._id) {
                payload.slotId = slot._id
            }

            console.log('[updateSlotSeats] Payload:', payload)
            const { data } = await axios.post(
                backendUrl + `/api/admin/custom-slots/update`,
                payload,
                { headers: { aToken } }
            )
            
            console.log('[updateSlotSeats] Response:', data)
            if (data.success) {
                toast.success('Seats updated')
                fetchSlots(selectedDate.split('-').reverse().join('_'))
            } else {
                console.error('[updateSlotSeats] API returned success:false -', data.message)
                toast.error(data.message)
            }
        } catch (error) {
            console.error('[updateSlotSeats] Error:', error)
            toast.error(error.message)
        }
    }

    // Delete slot
    const deleteSlot = async (slotId) => {
        if (!confirm('Are you sure you want to delete this custom slot?')) return
        
        try {
            const { data } = await axios.delete(
                backendUrl + `/api/admin/custom-slots/${slotId}`,
                { headers: { aToken } }
            )
            
            if (data.success) {
                toast.success('Slot deleted')
                // Convert YYYY-MM-DD to DD_MM_YYYY
                const [year, month, day] = selectedDate.split('-')
                const formattedDate = `${day}_${month}_${year}`
                fetchSlots(formattedDate)
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.message)
        }
    }

    // Handle date selection
    const handleDateChange = (e) => {
        const date = e.target.value
        setSelectedDate(date)
        
        if (date) {
            // Convert YYYY-MM-DD to DD_MM_YYYY
            const [year, month, day] = date.split('-')
            const formattedDate = `${day}_${month}_${year}`
            fetchSlots(formattedDate)
        } else {
            setSlots([])
        }
    }

    // Format date for display
    const formatDisplayDate = (dateStr) => {
        if (!dateStr) return ''
        const [day, month, year] = dateStr.split('_')
        return `${day}/${month}/${year}`
    }

    return (
        <div className='p-6 max-w-6xl'>
            <div className='flex items-center gap-2 mb-6'>
                <span className='text-2xl'>⚙️</span>
                <h2 className='text-2xl font-semibold'>Custom Slot Management</h2>
            </div>
            <p className='text-gray-600 mb-6'>
                Add extra slots, modify seat capacity, or disable specific slots for any day
            </p>

            {/* Date Selector */}
            <div className='bg-white rounded-lg shadow-sm p-6 mb-6'>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                    Select Date
                </label>
                <input
                    type='date'
                    value={selectedDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={handleDateChange}
                    className='border border-gray-300 rounded-lg px-4 py-2 w-full md:w-64 focus:ring-2 focus:ring-primary focus:border-transparent'
                />
            </div>

            {selectedDate && (
                <>
                    {/* Day Info Banner */}
                    {dayInfo && (
                        <div className={`mb-4 p-4 rounded-lg ${
                            dayInfo.isHoliday 
                                ? 'bg-red-50 border border-red-200' 
                                : !dayInfo.isDayEnabled 
                                    ? 'bg-yellow-50 border border-yellow-200'
                                    : 'bg-blue-50 border border-blue-200'
                        }`}>
                            <p className='font-medium'>
                                {dayInfo.isHoliday && '🏖️ This is a holiday - No bookings allowed'}
                                {!dayInfo.isHoliday && !dayInfo.isDayEnabled && `⚠️ ${dayInfo.dayName.toUpperCase()} is disabled in working hours`}
                                {!dayInfo.isHoliday && dayInfo.isDayEnabled && `✅ ${dayInfo.dayName.toUpperCase()} - Working day`}
                            </p>
                        </div>
                    )}

                    {/* Add Slot Button */}
                    <div className='mb-4'>
                        <button
                            onClick={() => setShowAddForm(!showAddForm)}
                            className='bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors'
                        >
                            {showAddForm ? '❌ Cancel' : '➕ Add Custom Slot'}
                        </button>
                    </div>

                    {/* Add Slot Form */}
                    {showAddForm && (
                        <div className='bg-white rounded-lg shadow-sm p-6 mb-6'>
                            <h3 className='text-lg font-semibold mb-4'>Add New Custom Slot</h3>
                            
                            <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mb-4'>
                                <div>
                                    <label className='block text-sm font-medium text-gray-700 mb-2'>
                                        Select Time
                                    </label>
                                    <select
                                        value={newSlot.time}
                                        onChange={(e) => setNewSlot({ ...newSlot, time: e.target.value })}
                                        className='border border-gray-300 rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-primary focus:border-transparent'
                                    >
                                        <option value=''>Select a time...</option>
                                        {availableTimes.map((time) => (
                                            <option key={time} value={time}>
                                                {time}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                
                                <div>
                                    <label className='block text-sm font-medium text-gray-700 mb-2'>
                                        Max Seats
                                    </label>
                                    <input
                                        type='number'
                                        min='1'
                                        value={newSlot.maxSeats}
                                        onChange={(e) => setNewSlot({ ...newSlot, maxSeats: e.target.value })}
                                        className='border border-gray-300 rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-primary focus:border-transparent'
                                    />
                                </div>
                                
                                <div>
                                    <label className='block text-sm font-medium text-gray-700 mb-2'>
                                        Notes (Optional)
                                    </label>
                                    <input
                                        type='text'
                                        placeholder='Special slot'
                                        value={newSlot.notes}
                                        onChange={(e) => setNewSlot({ ...newSlot, notes: e.target.value })}
                                        className='border border-gray-300 rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-primary focus:border-transparent'
                                    />
                                </div>
                            </div>
                            
                            <button
                                onClick={handleAddSlot}
                                className='bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-colors'
                            >
                                ✅ Add Slot
                            </button>
                        </div>
                    )}

                    {/* Slots List */}
                    <div className='bg-white rounded-lg shadow-sm p-6'>
                        <h3 className='text-lg font-semibold mb-4'>
                            All Slots for {formatDisplayDate(selectedDate.split('-').reverse().join('_'))}
                        </h3>
                        
                        {loading ? (
                            <p className='text-gray-500'>Loading...</p>
                        ) : slots.length === 0 ? (
                            <p className='text-gray-500'>
                                {dayInfo?.isHoliday 
                                    ? 'No slots available - this is a holiday' 
                                    : !dayInfo?.isDayEnabled 
                                        ? 'No slots available - working hours not configured for this day'
                                        : 'No slots configured for this date'}
                            </p>
                        ) : (
                            <div className='space-y-3'>
                                {slots.map((slot, index) => (
                                    <div 
                                        key={slot._id || index} 
                                        className={`flex items-center justify-between p-4 border rounded-lg ${
                                            slot.enabled ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                                        }`}
                                    >
                                        <div className='flex-1'>
                                            <div className='flex items-center gap-3'>
                                                <span className='text-lg font-semibold'>{slot.time}</span>
                                                {slot.isAutoGenerated && (
                                                    <span className='text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded'>
                                                        Auto-generated
                                                    </span>
                                                )}
                                                {slot.isCustom && (
                                                    <span className='text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded'>
                                                        Custom Added
                                                    </span>
                                                )}
                                                {!slot.isCustom && !slot.isAutoGenerated && (
                                                    <span className='text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded'>
                                                        Modified
                                                    </span>
                                                )}
                                                <span className={`text-xs px-2 py-1 rounded ${
                                                    slot.enabled 
                                                        ? 'bg-green-100 text-green-700' 
                                                        : 'bg-red-100 text-red-700'
                                                }`}>
                                                    {slot.enabled ? 'Enabled' : 'Disabled'}
                                                </span>
                                            </div>
                                            {slot.notes && (
                                                <p className='text-sm text-gray-600 mt-1'>{slot.notes}</p>
                                            )}
                                        </div>
                                        
                                        <div className='flex items-center gap-3'>
                                            <div className='flex items-center gap-2'>
                                                <label className='text-sm text-gray-600'>Seats:</label>
                                                <input
                                                    type='number'
                                                    min='1'
                                                    value={slot.maxSeats}
                                                    onChange={(e) => updateSlotSeats(slot, e.target.value)}
                                                    className='border border-gray-300 rounded px-2 py-1 w-16 text-center'
                                                />
                                            </div>
                                            
                                            <button
                                                onClick={() => toggleSlot(slot, slot.enabled)}
                                                className={`px-4 py-2 rounded-lg text-white transition-colors ${
                                                    slot.enabled 
                                                        ? 'bg-red-500 hover:bg-red-600' 
                                                        : 'bg-green-500 hover:bg-green-600'
                                                }`}
                                            >
                                                {slot.enabled ? '❌ Disable' : '✅ Enable'}
                                            </button>
                                            
                                            {slot.isCustom && (
                                                <button
                                                    onClick={() => deleteSlot(slot._id)}
                                                    className='px-4 py-2 rounded-lg bg-gray-500 text-white hover:bg-gray-600 transition-colors'
                                                >
                                                    🗑️ Delete
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    )
}

export default CustomSlots
