import dotenv from 'dotenv'
dotenv.config()
import connectDB from './config/mongodb.js'
import appointmentModel from './models/appointmentModel.js'

const run = async () => {
  try {
    await connectDB()
    const all = await appointmentModel.find({})
    let changed = 0
    for (const a of all) {
      let updated = {}
      if (a.slotDate && typeof a.slotDate === 'string' && (a.slotDate.includes('T') || a.slotDate.includes('-'))) {
        const d = new Date(a.slotDate)
        if (!isNaN(d)) {
          const key = `${d.getDate()}_${d.getMonth()+1}_${d.getFullYear()}`
          updated.slotDate = key
        }
      }
      if (a.slotTime && typeof a.slotTime === 'string') {
        const norm = a.slotTime.toLowerCase()
        if (norm !== a.slotTime) updated.slotTime = norm
      }
      if (Object.keys(updated).length) {
        await appointmentModel.findByIdAndUpdate(a._id, updated)
        console.log('Updated appointment', a._id.toString(), updated)
        changed++
      }
    }
    console.log('Done. Changed', changed)
    process.exit(0)
  } catch (e) {
    console.error('Failed', e)
    process.exit(1)
  }
}

run()
