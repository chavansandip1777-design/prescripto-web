import dotenv from 'dotenv'
dotenv.config()
import connectDB from './config/mongodb.js'
import doctorModel from './models/doctorModel.js'
import availabilityModel from './models/availabilityModel.js'

const run = async () => {
    try {
        await connectDB()
        const doctors = await doctorModel.find({})
        if (!doctors.length) {
            console.log('No doctors found. Please seed doctors first.')
            process.exit(1)
        }
        const doc = doctors[0]
        const created = []
        for (let i = 1; i <= 7; i++) {
            const d = new Date(); d.setDate(d.getDate() + i)
            const dateKey = `${d.getDate()}_${d.getMonth() + 1}_${d.getFullYear()}`
            const exists = await availabilityModel.findOne({ docId: doc._id, date: dateKey })
            if (exists) continue
            const totalSlots = 6 + (i % 3) // vary slightly
            const slotDurationMinutes = [15, 30, 30, 45, 60][i % 5]
            const startHour = 9
            const endHour = 17
            const avail = new availabilityModel({ docId: doc._id, date: dateKey, totalSlots, slotDurationMinutes, startHour, endHour })
            await avail.save()
            created.push(avail)
            console.log('Created availability', dateKey)
        }
        console.log('Done. Created', created.length, 'availability entries')
        process.exit(0)
    } catch (err) {
        console.error('Seed failed', err)
        process.exit(1)
    }
}

run()
