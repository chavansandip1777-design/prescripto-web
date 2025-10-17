import dotenv from 'dotenv'
dotenv.config()
import connectDB from './config/mongodb.js'
import doctorModel from './models/doctorModel.js'
import availabilityModel from './models/availabilityModel.js'
import adminSettingsModel from './models/adminSettingsModel.js'

const normalizeSlotDateKey = (slotDate) => {
    if (!slotDate) return slotDate
    if (typeof slotDate === 'string' && /^\d{1,2}_\d{1,2}_\d{4}$/.test(slotDate)) return slotDate
    const maybe = new Date(slotDate)
    if (!isNaN(maybe)) {
        return `${maybe.getDate()}_${maybe.getMonth() + 1}_${maybe.getFullYear()}`
    }
    if (typeof slotDate === 'string') {
        const withoutMs = slotDate.split('.').shift()
        return withoutMs.replace(/[^0-9]/g, '_')
    }
    return slotDate
}

const run = async () => {
    await connectDB()
    const docId = '68ed423a3585f3aa3b3e3138'
    const slotDate = '2025-10-17T18:30:00.000Z'
    const slotTime = '09:30 am'

    const doc = await doctorModel.findById(docId)
    console.log('DOCTOR slots_booked:', JSON.stringify(doc.slots_booked, null, 2))

    let slotDateKey = normalizeSlotDateKey(slotDate)
    console.log('normalized incoming slotDateKey:', slotDateKey)

    let availability = await availabilityModel.findOne({ docId, date: slotDateKey })
    if (availability) {
        slotDateKey = normalizeSlotDateKey(availability.date)
    }
    console.log('availability entry date:', availability && availability.date)
    console.log('final slotDateKey used:', slotDateKey)

    const settings = await adminSettingsModel.findOne({})
    const globalSeatsPerSlot = settings ? settings.seatsPerSlot : 1

    let seatsAllocatedForSlot = globalSeatsPerSlot
    if (availability) {
        const dateObjParts = availability.date.split('_').map(Number)
        const dateObj = new Date(dateObjParts[2], dateObjParts[1] - 1, dateObjParts[0])
        const slotDuration = availability.slotDurationMinutes
        let cursor = new Date(dateObj)
        cursor.setHours(availability.startHour, 0, 0, 0)
        const endTime = new Date(dateObj)
        endTime.setHours(availability.endHour, 0, 0, 0)
        const slotsTimes = []
        while (cursor < endTime) {
            slotsTimes.push(new Date(cursor))
            cursor = new Date(cursor.getTime() + slotDuration * 60 * 1000)
        }
        const S = slotsTimes.length
        const totalSeats = Number(availability.totalSlots) || 0
        const base = S > 0 ? Math.floor(totalSeats / S) : 0
        const remainder = S > 0 ? totalSeats % S : 0
        const formatTime = (dt) => new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).format(dt).toLowerCase()
        const formattedTimes = slotsTimes.map(t => formatTime(t))
        const normalizedSlotTime = slotTime && typeof slotTime === 'string' ? slotTime.toLowerCase() : slotTime
        const idx = formattedTimes.findIndex(t => t === normalizedSlotTime)
        console.log('formattedTimes index:', idx, 'formattedTimes:', formattedTimes.slice(0, 5))
        seatsAllocatedForSlot = base + (idx < remainder ? 1 : 0)
    }

    const normalizedSlotTime = slotTime && typeof slotTime === 'string' ? slotTime.toLowerCase() : slotTime
    const path = `slots_booked.${slotDateKey}.${normalizedSlotTime}`
    const filter = {
        _id: docId,
        $or: [
            { [path]: { $lt: seatsAllocatedForSlot } },
            { [path]: { $exists: false } }
        ]
    }
    console.log('SIM path=', path)
    console.log('SIM filter=', JSON.stringify(filter))

    const updated = await doctorModel.findOneAndUpdate(filter, { $inc: { [path]: 1 } }, { new: true })
    console.log('SIM update returned:', !!updated)
    if (updated) console.log('updated slots_booked:', JSON.stringify(updated.slots_booked, null, 2))
    process.exit(0)
}

run().catch(err => { console.error(err); process.exit(1) })
