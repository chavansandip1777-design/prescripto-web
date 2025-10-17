import dotenv from 'dotenv'
dotenv.config()
import connectDB from './config/mongodb.js'
import doctorModel from './models/doctorModel.js'

const isTimeKey = (k) => {
    // crude heuristic: contains am or pm
    return typeof k === 'string' && (k.toLowerCase().includes('am') || k.toLowerCase().includes('pm'))
}

const collectLeaves = (node, parts = [], out = []) => {
    if (!node || typeof node !== 'object') return out
    const keys = Object.keys(node)
    // if children are numeric counts (leaf time keys)
    const allLeafsNumeric = keys.length && keys.every(k => typeof node[k] === 'number')
    if (allLeafsNumeric) {
        for (const k of keys) {
            out.push({ dateParts: parts, time: k, count: node[k] })
        }
        return out
    }
    // otherwise recurse
    for (const k of keys) {
        collectLeaves(node[k], parts.concat([k]), out)
    }
    return out
}

const run = async () => {
    try {
        await connectDB()
        const doctors = await doctorModel.find({})
        console.log('Found', doctors.length, 'doctors')
        for (const doc of doctors) {
            const slots_booked = doc.slots_booked || {}
            const newMap = {}
            for (const topKey of Object.keys(slots_booked)) {
                const val = slots_booked[topKey]
                if (!val) continue
                if (topKey.includes('_')) {
                    // already DD_MM_YYYY format
                    const dateKey = topKey
                    if (typeof val === 'object') {
                        if (!newMap[dateKey]) newMap[dateKey] = {}
                        // copy/merge times
                        for (const t of Object.keys(val)) {
                            const v = val[t]
                            if (typeof v === 'number') newMap[dateKey][t] = (newMap[dateKey][t] || 0) + v
                        }
                    }
                    continue
                }
                // else flatten nested structure
                const leaves = collectLeaves(val, [topKey], [])
                if (leaves.length === 0) continue
                for (const leaf of leaves) {
                    // date candidate is joining parts except the last if last is time
                    const parts = leaf.dateParts
                    // if parts contain time-like strings at end, pop until remaining forms a date
                    // join parts except the last if last looks like time
                    let dateParts = parts
                    // sometimes collectLeaves includes the date entirely in parts and leaf.time is actual time
                    // build dateIsoCandidate by joining parts with '.'
                    const dateIsoCandidate = dateParts.join('.')
                    const d = new Date(dateIsoCandidate)
                    if (isNaN(d)) {
                        // try one less part
                        if (dateParts.length > 1) {
                            const cand = dateParts.slice(0, -1).join('.')
                            const d2 = new Date(cand)
                            if (!isNaN(d2)) {
                                const dk = `${d2.getDate()}_${d2.getMonth() + 1}_${d2.getFullYear()}`
                                if (!newMap[dk]) newMap[dk] = {}
                                newMap[dk][leaf.time] = (newMap[dk][leaf.time] || 0) + leaf.count
                                continue
                            }
                        }
                        // fallback: skip
                        continue
                    }
                    const dk = `${d.getDate()}_${d.getMonth() + 1}_${d.getFullYear()}`
                    if (!newMap[dk]) newMap[dk] = {}
                    newMap[dk][leaf.time] = (newMap[dk][leaf.time] || 0) + leaf.count
                }
            }
            // if newMap differs from existing, update
            const keysEqual = JSON.stringify(newMap) === JSON.stringify(doc.slots_booked || {})
            if (!keysEqual) {
                await doctorModel.findByIdAndUpdate(doc._id, { slots_booked: newMap })
                console.log('Updated slots_booked for doctor', doc._id.toString())
            }
        }
        console.log('Done')
        process.exit(0)
    } catch (err) {
        console.error('Normalization failed', err)
        process.exit(1)
    }
}

run()
