import dotenv from 'dotenv'
dotenv.config()
import connectDB from './config/mongodb.js'
import doctorModel from './models/doctorModel.js'

const run = async () => {
    try {
        await connectDB()
        const doctors = await doctorModel.find({})
        if (!doctors.length) {
            console.log('No doctors found')
            process.exit(1)
        }
        const doc = doctors[0]
        await doctorModel.findByIdAndUpdate(doc._id, { slots_booked: {} })
        console.log('Cleared slots_booked for doctor', doc._id)
        process.exit(0)
    } catch (err) {
        console.error('reset failed', err)
        process.exit(1)
    }
}

run()
