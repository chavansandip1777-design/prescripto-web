import dotenv from 'dotenv'
dotenv.config()
import connectDB from './config/mongodb.js'
import doctorModel from './models/doctorModel.js'

const toCanonical = (k) => {
    if (!k || typeof k !== 'string') return null
    if (/^\d{1,2}_\d{1,2}_\d{4}$/.test(k)) return k
    // try parse as ISO-like
    const d = new Date(k)
    if (!isNaN(d)) return `${d.getDate()}_${d.getMonth() + 1}_${d.getFullYear()}`
    // try stripping after 'T' or dots
    const stripped = k.split('.').shift()
    const d2 = new Date(stripped)
    if (!isNaN(d2)) return `${d2.getDate()}_${d2.getMonth() + 1}_${d2.getFullYear()}`
    return null
}

const run = async () => {
    try {
        await connectDB()
        const docs = await doctorModel.find({})
        let changed = 0
        for (const doc of docs) {
            const sb = doc.slots_booked || {}
            const newMap = { ...sb }
            let modified = false
            for (const topKey of Object.keys(sb)) {
                if (topKey.includes('_')) continue
                const canonical = toCanonical(topKey)
                if (!canonical) continue
                const val = sb[topKey]
                // if val is direct map of times (unlikely), handle
                if (typeof val === 'object') {
                    // find deepest map if nested one level (like { '000Z': { '09:30 am': 1 } })
                    let leaf = val
                    const keys = Object.keys(val)
                    if (keys.length === 1 && typeof val[keys[0]] === 'object') {
                        leaf = val[keys[0]]
                    }
                    if (!newMap[canonical]) newMap[canonical] = {}
                    for (const t of Object.keys(leaf)) {
                        const count = typeof leaf[t] === 'number' ? leaf[t] : 0
                        newMap[canonical][t] = (newMap[canonical][t] || 0) + count
                    }
                    // remove old key
                    delete newMap[topKey]
                    modified = true
                }
            }
            if (modified) {
                await doctorModel.findByIdAndUpdate(doc._id, { slots_booked: newMap })
                console.log('Normalized doctor', doc._id.toString())
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
