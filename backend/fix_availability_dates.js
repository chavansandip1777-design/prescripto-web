import dotenv from 'dotenv'
dotenv.config()
import connectDB from './config/mongodb.js'
import availabilityModel from './models/availabilityModel.js'

const run = async () => {
    try {
        await connectDB()
        const all = await availabilityModel.find({})
        let changed = 0
        for (const a of all) {
            // if date contains 'T' it's likely an ISO string
            if (a.date && a.date.includes('T')) {
                const d = new Date(a.date)
                if (isNaN(d)) continue
                const key = `${d.getDate()}_${d.getMonth() + 1}_${d.getFullYear()}`
                // avoid duplicate key
                const exists = await availabilityModel.findOne({ docId: a.docId, date: key })
                if (exists) {
                    // delete this duplicated iso entry
                    await availabilityModel.findByIdAndDelete(a._id)
                    console.log('Removed duplicate ISO entry', a._id.toString(), '->', key)
                } else {
                    await availabilityModel.findByIdAndUpdate(a._id, { date: key })
                    console.log('Updated', a._id.toString(), 'to', key)
                }
                changed++
            }
        }
        console.log('Done. Changed', changed)
        process.exit(0)
    } catch (err) {
        console.error('Failed', err)
        process.exit(1)
    }
}

run()
