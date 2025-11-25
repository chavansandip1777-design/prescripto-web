import React, { useContext, useEffect, useState } from 'react'
import { AdminContext } from '../../context/AdminContext'
import { AppContext } from '../../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'

const AvailabilityConfig = () => {
  const { aToken, backendUrl } = useContext(AdminContext)
  const { slotDateFormat } = useContext(AppContext)

  const [selectedDate, setSelectedDate] = useState('')
  const [slots, setSlots] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [showAddSlot, setShowAddSlot] = useState(false)
  const [sortConfig, setSortConfig] = useState({ key: 'time', direction: 'asc' })
  const [showBulkCreate, setShowBulkCreate] = useState(false)

  // New slot form
  const [newSlot, setNewSlot] = useState({
    time: '',
    maxSeats: 1
  })

  // Bulk create form
  const [bulkForm, setBulkForm] = useState({
    startDate: '',
    endDate: '',
    startTime: '10:00 AM',
    endTime: '05:00 PM',
    slotDuration: 30,
    seatsPerSlot: 1,
    skipWeekends: true
  })

  // Quick enable day - creates default slots for a single day
  const quickEnableDay = async (dateToEnable) => {
    const date = dateToEnable || selectedDate
    if (!date) return toast.error('Please select a date')

    if (!confirm(`Create default slots (10 AM - 5 PM, 30-min intervals, 5 seats each) for ${new Date(date + 'T00:00:00').toLocaleDateString()}?`)) return

    try {
      setIsLoading(true)
      
      const { data } = await axios.post(
        `${backendUrl}/api/admin/bulk-create-slots`,
        {
          startDate: date,
          endDate: date,
          startTime: '10:00 AM',
          endTime: '05:00 PM',
          slotDuration: 30,
          seatsPerSlot: 5,
          skipWeekends: false
        },
        { headers: { aToken } }
      )

      if (data.success) {
        toast.success('Day enabled with default slots')
        fetchSlotsForDate(date)
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      console.error(error)
      toast.error('Failed to enable day')
    } finally {
      setIsLoading(false)
    }
  }

  // Disable entire day - disables all slots for the date
  const disableEntireDay = async () => {
    if (!selectedDate) return toast.error('Please select a date')

    if (!confirm(`Disable the entire day (${new Date(selectedDate + 'T00:00:00').toLocaleDateString()})? This will hide it from the booking calendar.`)) return

    try {
      setIsLoading(true)
      const apiDate = convertToApiDate(selectedDate)
      const promises = slots.map(slot =>
        axios.post(
          `${backendUrl}/api/admin/update-slot`,
          { slotId: slot._id, isEnabled: false },
          { headers: { aToken } }
        )
      )

      await Promise.all(promises)
      toast.success('Day disabled on calendar')
      fetchSlotsForDate(selectedDate)
    } catch (error) {
      console.error(error)
      toast.error('Failed to disable day')
    } finally {
      setIsLoading(false)
    }
  }

  // Enable entire day - enables all slots for the date
  const enableEntireDay = async () => {
    if (!selectedDate) return toast.error('Please select a date')

    if (!confirm(`Enable the entire day (${new Date(selectedDate + 'T00:00:00').toLocaleDateString()})? This will show it on the booking calendar.`)) return

    try {
      setIsLoading(true)
      const apiDate = convertToApiDate(selectedDate)
      const promises = slots.map(slot =>
        axios.post(
          `${backendUrl}/api/admin/update-slot`,
          { slotId: slot._id, isEnabled: true },
          { headers: { aToken } }
        )
      )

      await Promise.all(promises)
      toast.success('Day enabled on calendar')
      fetchSlotsForDate(selectedDate)
    } catch (error) {
      console.error(error)
      toast.error('Failed to enable day')
    } finally {
      setIsLoading(false)
    }
  }

  // Generate time options
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

  // Convert time string to sortable number (e.g., "02:30 PM" -> 1430)
  const timeToNumber = (timeStr) => {
    const [time, period] = timeStr.split(' ')
    const [hours, minutes] = time.split(':').map(Number)
    let hour24 = hours
    if (period === 'PM' && hours !== 12) hour24 += 12
    if (period === 'AM' && hours === 12) hour24 = 0
    return hour24 * 100 + minutes
  }

  // Sort slots based on current sort configuration
  const getSortedSlots = () => {
    if (!slots.length) return []
    
    const sorted = [...slots].sort((a, b) => {
      let aValue, bValue
      
      switch (sortConfig.key) {
        case 'time':
          aValue = timeToNumber(a.time)
          bValue = timeToNumber(b.time)
          break
        case 'seats':
          aValue = a.maxSeats
          bValue = b.maxSeats
          break
        case 'booked':
          aValue = a.bookedSeats
          bValue = b.bookedSeats
          break
        case 'available':
          aValue = a.availableSeats
          bValue = b.availableSeats
          break
        case 'status':
          aValue = a.isEnabled ? 1 : 0
          bValue = b.isEnabled ? 1 : 0
          break
        default:
          return 0
      }
      
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
    
    return sorted
  }

  // Handle column header click for sorting
  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  // Get sort icon for column header
  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return '↕️'
    return sortConfig.direction === 'asc' ? '↑' : '↓'
  }

  // Convert date from YYYY-MM-DD to DD_MM_YYYY
  const convertToApiDate = (dateStr) => {
    if (!dateStr) return ''
    const [year, month, day] = dateStr.split('-')
    return `${day}_${month}_${year}`
  }

  // Fetch slots for selected date
  const fetchSlotsForDate = async (date) => {
    if (!date) return
    
    try {
      setIsLoading(true)
      const apiDate = convertToApiDate(date)
      const { data } = await axios.get(`${backendUrl}/api/admin/slots?date=${apiDate}`, { 
        headers: { aToken } 
      })

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

  // Add new slot
  const addSlot = async () => {
    if (!selectedDate || !newSlot.time) {
      return toast.error('Please select date and time')
    }

    try {
      const apiDate = convertToApiDate(selectedDate)
      const { data } = await axios.post(
        `${backendUrl}/api/admin/create-slot`,
        {
          date: apiDate,
          time: newSlot.time,
          maxSeats: newSlot.maxSeats
        },
        { headers: { aToken } }
      )

      if (data.success) {
        toast.success('Slot added successfully')
        setShowAddSlot(false)
        setNewSlot({ time: '', maxSeats: 1 })
        fetchSlotsForDate(selectedDate)
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      console.error(error)
      toast.error('Failed to add slot')
    }
  }

  // Update slot seats
  const updateSlotSeats = async (slotId, currentSeats) => {
    const newSeats = prompt(`Enter new seat capacity (current: ${currentSeats}):`, currentSeats)
    
    if (newSeats === null) return
    
    const seats = parseInt(newSeats)
    if (isNaN(seats) || seats < 1) {
      return toast.error('Please enter a valid number (minimum 1)')
    }

    try {
      const { data } = await axios.post(
        `${backendUrl}/api/admin/update-slot`,
        { slotId, maxSeats: seats },
        { headers: { aToken } }
      )

      if (data.success) {
        toast.success('Seat capacity updated')
        fetchSlotsForDate(selectedDate)
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      console.error(error)
      toast.error('Failed to update seats')
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
        toast.success(`Slot ${!currentStatus ? 'enabled' : 'disabled'}`)
        fetchSlotsForDate(selectedDate)
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      console.error(error)
      toast.error('Failed to update slot')
    }
  }

  // Delete slot
  const deleteSlot = async (slotId, bookedSeats) => {
    if (bookedSeats > 0) {
      return toast.error('Cannot delete slot with existing bookings')
    }

    if (!confirm('Are you sure you want to delete this slot?')) return

    try {
      const { data } = await axios.post(
        `${backendUrl}/api/admin/delete-slot`,
        { slotId },
        { headers: { aToken } }
      )

      if (data.success) {
        toast.success('Slot deleted')
        fetchSlotsForDate(selectedDate)
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      console.error(error)
      toast.error('Failed to delete slot')
    }
  }

  // Disable all slots for the selected date
  const disableAllSlots = async () => {
    if (!selectedDate) return

    if (!confirm(`Disable all slots for ${new Date(selectedDate + 'T00:00:00').toLocaleDateString()}?`)) return

    try {
      const apiDate = convertToApiDate(selectedDate)
      const promises = slots.filter(s => s.isEnabled).map(slot =>
        axios.post(
          `${backendUrl}/api/admin/update-slot`,
          { slotId: slot._id, isEnabled: false },
          { headers: { aToken } }
        )
      )

      await Promise.all(promises)
      toast.success('All slots disabled')
      fetchSlotsForDate(selectedDate)
    } catch (error) {
      console.error(error)
      toast.error('Failed to disable slots')
    }
  }

  // Enable all slots for the selected date
  const enableAllSlots = async () => {
    if (!selectedDate) return

    if (!confirm(`Enable all slots for ${new Date(selectedDate + 'T00:00:00').toLocaleDateString()}?`)) return

    try {
      const apiDate = convertToApiDate(selectedDate)
      const promises = slots.filter(s => !s.isEnabled).map(slot =>
        axios.post(
          `${backendUrl}/api/admin/update-slot`,
          { slotId: slot._id, isEnabled: true },
          { headers: { aToken } }
        )
      )

      await Promise.all(promises)
      toast.success('All slots enabled')
      fetchSlotsForDate(selectedDate)
    } catch (error) {
      console.error(error)
      toast.error('Failed to enable slots')
    }
  }

  // Bulk create slots for date range
  const bulkCreateSlots = async () => {
    if (!bulkForm.startDate || !bulkForm.endDate) {
      return toast.error('Please select start and end dates')
    }

    try {
      setIsLoading(true)

      const { data } = await axios.post(
        `${backendUrl}/api/admin/bulk-create-slots`,
        {
          startDate: bulkForm.startDate,
          endDate: bulkForm.endDate,
          startTime: bulkForm.startTime,
          endTime: bulkForm.endTime,
          slotDuration: bulkForm.slotDuration,
          seatsPerSlot: bulkForm.seatsPerSlot,
          skipWeekends: bulkForm.skipWeekends
        },
        { headers: { aToken } }
      )

      if (data.success) {
        toast.success(data.message || 'Slots created successfully')
        setShowBulkCreate(false)
        setBulkForm({
          startDate: '',
          endDate: '',
          startTime: '10:00 AM',
          endTime: '05:00 PM',
          slotDuration: 30,
          seatsPerSlot: 1,
          skipWeekends: true
        })
        if (selectedDate) fetchSlotsForDate(selectedDate)
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      console.error(error)
      toast.error('Failed to create slots')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle date selection
  const handleDateChange = (date) => {
    setSelectedDate(date)
    if (date) {
      fetchSlotsForDate(date)
    } else {
      setSlots([])
    }
  }

  return (
    <div className='p-6 max-w-6xl'>
      <h2 className='text-2xl font-semibold mb-2'>Availability Configuration</h2>
      <p className='text-sm text-gray-600 mb-6'>
        📌 <strong>Important:</strong> Dates appear on the booking calendar ONLY when they have enabled slots. 
        Use "Bulk Create" for multiple dates or "Add Slot" for single dates.
      </p>

      {/* Date Selection */}
      <div className='bg-white p-6 rounded-lg shadow-sm mb-6'>
        <div className='mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg'>
          <p className='text-sm text-blue-800'>
            <strong>💡 Quick Start Guide:</strong>
          </p>
          <ul className='text-sm text-blue-700 mt-2 space-y-1 ml-4 list-disc'>
            <li><strong>Enable Multiple Dates:</strong> Click "Bulk Create" → Select date range → Configure times & seats</li>
            <li><strong>Enable Single Date:</strong> Select date below → Click "+ Add Slot" → Choose time & seats</li>
            <li><strong>Modify Existing:</strong> Select date → View table → Update seats or enable/disable slots</li>
          </ul>
        </div>
        
        <div className='flex items-end gap-4'>
          <div className='flex-1'>
            <label className='block text-sm font-medium mb-2'>Select Date</label>
            <input
              type='date'
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className='w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
          <button
            onClick={() => setShowAddSlot(true)}
            disabled={!selectedDate}
            className='px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'
          >
            + Add Slot
          </button>
          <button
            onClick={() => setShowBulkCreate(true)}
            className='px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium'
            title='Create slots for multiple dates at once'
          >
            📅 Bulk Create
          </button>
        </div>
        {selectedDate && (
          <div className='mt-4'>
            <p className='text-sm text-gray-600 mb-2'>
              Showing slots for: <span className='font-semibold'>{new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </p>
            {slots.length === 0 ? (
              <div className='space-y-2'>
                <div className='p-3 bg-yellow-50 border border-yellow-200 rounded text-sm'>
                  <p className='text-yellow-800'>
                    ⚠️ <strong>This date is DISABLED on the booking calendar.</strong> No slots exist yet.
                  </p>
                </div>
                <button
                  onClick={() => quickEnableDay(selectedDate)}
                  disabled={isLoading}
                  className='w-full px-4 py-2.5 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium disabled:opacity-50'
                >
                  {isLoading ? '⏳ Creating...' : '✓ ENABLE THIS DAY (Create Default Slots)'}
                </button>
                <p className='text-xs text-gray-500 text-center'>
                  Creates slots from 10 AM - 5 PM (30-min intervals, 5 seats each)
                </p>
              </div>
            ) : (
              <div className='flex gap-2'>
                <button
                  onClick={enableEntireDay}
                  disabled={!slots.length || slots.every(s => s.isEnabled) || isLoading}
                  className='flex-1 px-4 py-1.5 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium'
                >
                  ✓ ENABLE DAY
                </button>
                <button
                  onClick={disableEntireDay}
                  disabled={!slots.length || slots.every(s => !s.isEnabled) || isLoading}
                  className='flex-1 px-4 py-1.5 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium'
                >
                  ✕ DISABLE DAY
                </button>
              </div>
            )}
          </div>
        )}
        {!selectedDate && (
          <p className='text-sm text-gray-500 mt-4 italic'>
            👆 Select a date above to view/manage its slots, or use "Bulk Create" to enable multiple dates at once.
          </p>
        )}
      </div>

      {/* Slots Table */}
      {selectedDate && (
        <div className='bg-white rounded-lg shadow-sm overflow-hidden'>
          <div className='px-6 py-4 border-b bg-gray-50'>
            <h3 className='text-lg font-semibold'>Time Slots ({slots.length})</h3>
          </div>
          
          {isLoading ? (
            <div className='p-10 text-center text-gray-500'>Loading slots...</div>
          ) : slots.length === 0 ? (
            <div className='p-10 text-center text-gray-500'>
              <p className='mb-2'>No slots configured for this date.</p>
              <p className='text-sm'>Click "Add Slot" to create your first slot.</p>
            </div>
          ) : (
            <div className='overflow-x-auto'>
              <table className='w-full'>
                <thead className='bg-gray-50 border-b'>
                  <tr>
                    <th 
                      className='px-6 py-3 text-left text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100 select-none'
                      onClick={() => handleSort('time')}
                      title='Click to sort'
                    >
                      Time {getSortIcon('time')}
                    </th>
                    <th 
                      className='px-6 py-3 text-center text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100 select-none'
                      onClick={() => handleSort('seats')}
                      title='Click to sort'
                    >
                      Seats {getSortIcon('seats')}
                    </th>
                    <th 
                      className='px-6 py-3 text-center text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100 select-none'
                      onClick={() => handleSort('booked')}
                      title='Click to sort'
                    >
                      Booked {getSortIcon('booked')}
                    </th>
                    <th 
                      className='px-6 py-3 text-center text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100 select-none'
                      onClick={() => handleSort('available')}
                      title='Click to sort'
                    >
                      Available {getSortIcon('available')}
                    </th>
                    <th 
                      className='px-6 py-3 text-center text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100 select-none'
                      onClick={() => handleSort('status')}
                      title='Click to sort'
                    >
                      Status {getSortIcon('status')}
                    </th>
                    <th className='px-6 py-3 text-center text-sm font-medium text-gray-700'>Actions</th>
                  </tr>
                </thead>
                <tbody className='divide-y'>
                  {getSortedSlots().map((slot) => (
                    <tr key={slot._id} className='hover:bg-gray-50'>
                      <td className='px-6 py-4 font-medium'>{slot.time}</td>
                      <td className='px-6 py-4 text-center'>
                        <button
                          onClick={() => updateSlotSeats(slot._id, slot.maxSeats)}
                          className='text-blue-600 hover:text-blue-700 hover:underline font-semibold'
                          title='Click to update seat capacity'
                        >
                          {slot.maxSeats}
                        </button>
                      </td>
                      <td className='px-6 py-4 text-center'>
                        <span className='font-semibold text-red-600'>{slot.bookedSeats}</span>
                      </td>
                      <td className='px-6 py-4 text-center'>
                        <span className='font-semibold text-green-600'>{slot.availableSeats}</span>
                      </td>
                      <td className='px-6 py-4 text-center'>
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                            slot.isEnabled
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {slot.isEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </td>
                      <td className='px-6 py-4'>
                        <div className='flex gap-2 justify-center'>
                          <button
                            onClick={() => toggleSlot(slot._id, slot.isEnabled)}
                            className={`px-3 py-1 rounded text-sm font-medium ${
                              slot.isEnabled
                                ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                          >
                            {slot.isEnabled ? 'Disable' : 'Enable'}
                          </button>
                          <button
                            onClick={() => deleteSlot(slot._id, slot.bookedSeats)}
                            disabled={slot.bookedSeats > 0}
                            className='px-3 py-1 bg-red-100 text-red-700 rounded text-sm font-medium hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed'
                            title={slot.bookedSeats > 0 ? 'Cannot delete slot with bookings' : 'Delete slot'}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add Slot Modal */}
      {showAddSlot && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
          <div className='bg-white rounded-lg p-6 w-full max-w-md'>
            <h3 className='text-xl font-semibold mb-4'>Add New Slot</h3>
            <div className='space-y-4'>
              <div>
                <label className='block text-sm font-medium mb-1'>Time Slot</label>
                <select
                  value={newSlot.time}
                  onChange={(e) => setNewSlot({ ...newSlot, time: e.target.value })}
                  className='w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                >
                  <option value=''>Select time</option>
                  {generateTimeOptions().map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className='block text-sm font-medium mb-1'>Seat Capacity</label>
                <input
                  type='number'
                  min='1'
                  value={newSlot.maxSeats}
                  onChange={(e) => setNewSlot({ ...newSlot, maxSeats: parseInt(e.target.value) || 1 })}
                  className='w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                />
              </div>
            </div>
            <div className='flex gap-3 mt-6'>
              <button
                onClick={() => {
                  setShowAddSlot(false)
                  setNewSlot({ time: '', maxSeats: 1 })
                }}
                className='flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300'
              >
                Cancel
              </button>
              <button
                onClick={addSlot}
                className='flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700'
              >
                Add Slot
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Create Modal */}
      {showBulkCreate && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
          <div className='bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto'>
            <h3 className='text-xl font-semibold mb-2'>Bulk Create Slots</h3>
            <p className='text-sm text-gray-600 mb-4'>
              Create slots for multiple dates at once. This will enable all selected dates on the booking calendar.
            </p>
            
            <div className='space-y-4'>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='block text-sm font-medium mb-1'>Start Date *</label>
                  <input
                    type='date'
                    value={bulkForm.startDate}
                    onChange={(e) => setBulkForm({ ...bulkForm, startDate: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    className='w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium mb-1'>End Date *</label>
                  <input
                    type='date'
                    value={bulkForm.endDate}
                    onChange={(e) => setBulkForm({ ...bulkForm, endDate: e.target.value })}
                    min={bulkForm.startDate || new Date().toISOString().split('T')[0]}
                    className='w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                  />
                </div>
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='block text-sm font-medium mb-1'>Start Time</label>
                  <select
                    value={bulkForm.startTime}
                    onChange={(e) => setBulkForm({ ...bulkForm, startTime: e.target.value })}
                    className='w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                  >
                    {generateTimeOptions().map((time) => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className='block text-sm font-medium mb-1'>End Time</label>
                  <select
                    value={bulkForm.endTime}
                    onChange={(e) => setBulkForm({ ...bulkForm, endTime: e.target.value })}
                    className='w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                  >
                    {generateTimeOptions().map((time) => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='block text-sm font-medium mb-1'>Slot Duration (minutes)</label>
                  <select
                    value={bulkForm.slotDuration}
                    onChange={(e) => setBulkForm({ ...bulkForm, slotDuration: parseInt(e.target.value) })}
                    className='w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                  >
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={45}>45 minutes</option>
                    <option value={60}>60 minutes</option>
                  </select>
                </div>
                <div>
                  <label className='block text-sm font-medium mb-1'>Seats Per Slot</label>
                  <input
                    type='number'
                    min='1'
                    max='50'
                    value={bulkForm.seatsPerSlot}
                    onChange={(e) => setBulkForm({ ...bulkForm, seatsPerSlot: parseInt(e.target.value) || 1 })}
                    className='w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                  />
                </div>
              </div>

              <div className='flex items-center gap-2'>
                <input
                  type='checkbox'
                  id='skipWeekends'
                  checked={bulkForm.skipWeekends}
                  onChange={(e) => setBulkForm({ ...bulkForm, skipWeekends: e.target.checked })}
                  className='w-4 h-4'
                />
                <label htmlFor='skipWeekends' className='text-sm font-medium'>Skip weekends (Saturday & Sunday)</label>
              </div>

              <div className='bg-blue-50 p-3 rounded text-sm text-gray-700'>
                <p className='font-medium mb-1'>📋 Preview:</p>
                <p>This will create slots from <strong>{bulkForm.startTime}</strong> to <strong>{bulkForm.endTime}</strong> every <strong>{bulkForm.slotDuration} minutes</strong> with <strong>{bulkForm.seatsPerSlot} seat(s)</strong> per slot.</p>
                <p className='mt-1'>Date range: <strong>{bulkForm.startDate || '(select)'}</strong> to <strong>{bulkForm.endDate || '(select)'}</strong>{bulkForm.skipWeekends ? ' (excluding weekends)' : ''}</p>
                <p className='mt-2 text-green-700 font-medium'>✓ All these dates will become enabled on the booking calendar</p>
              </div>
            </div>

            <div className='flex gap-3 mt-6'>
              <button
                onClick={() => {
                  setShowBulkCreate(false)
                  setBulkForm({
                    startDate: '',
                    endDate: '',
                    startTime: '10:00 AM',
                    endTime: '05:00 PM',
                    slotDuration: 30,
                    seatsPerSlot: 1,
                    skipWeekends: true
                  })
                }}
                className='flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300'
              >
                Cancel
              </button>
              <button
                onClick={bulkCreateSlots}
                disabled={isLoading}
                className='flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50'
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

export default AvailabilityConfig
