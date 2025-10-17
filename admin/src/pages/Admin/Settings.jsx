import React, { useEffect, useState, useContext } from 'react'
import axios from 'axios'
import { AdminContext } from '../../context/AdminContext'
import { toast } from 'react-toastify'

const Settings = () => {
    const { aToken } = useContext(AdminContext)
    const backendUrl = import.meta.env.VITE_BACKEND_URL

    const [activeDays, setActiveDays] = useState(3)
    const [seatsPerSlot, setSeatsPerSlot] = useState(1)
    const [slotDuration, setSlotDuration] = useState(30)

    const fetchSettings = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/admin/settings', { headers: { aToken } })
            if (data.success) {
                setActiveDays(data.settings.activeDays || 3)
                setSeatsPerSlot(data.settings.seatsPerSlot || 1)
                setSlotDuration(data.settings.slotDurationMinutes || 30)
            }
        } catch (error) {
            toast.error(error.message)
        }
    }

    const saveSettings = async () => {
        try {
            const { data } = await axios.post(backendUrl + '/api/admin/settings', { activeDays, seatsPerSlot, slotDurationMinutes: slotDuration }, { headers: { aToken } })
            if (data.success) {
                toast.success('Settings updated')
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.message)
        }
    }

    useEffect(() => {
        fetchSettings()
    }, [])

    return (
        <div className='p-6'>
            <h2 className='text-xl font-semibold mb-4'>Booking Settings</h2>
            <div className='max-w-sm'>
                <label className='block mb-2'>Active Days (including today)</label>
                <input type='number' value={activeDays} onChange={(e) => setActiveDays(Number(e.target.value))} className='border p-2 rounded mb-4 w-full' />

                <label className='block mb-2'>Seats per Half Hour Slot</label>
                <input type='number' value={seatsPerSlot} onChange={(e) => setSeatsPerSlot(Number(e.target.value))} className='border p-2 rounded mb-4 w-full' />

                <label className='block mb-2'>Slot Duration (minutes)</label>
                <input type='number' value={slotDuration} onChange={(e) => setSlotDuration(Number(e.target.value))} className='border p-2 rounded mb-4 w-full' />

                <button onClick={saveSettings} className='bg-primary text-white px-4 py-2 rounded'>Save</button>
            </div>
        </div>
    )
}

export default Settings
