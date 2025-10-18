/* Quick Mongo connection test (ES module). Reads MONGODB_URI or MONGO_URI from environment and tries to connect with extended timeouts.
   Usage (PowerShell):
     # use your existing .env or set $env:MONGODB_URI for the session
     node backend/test_mongo_conn.js
*/

// auto-load .env when present
import 'dotenv/config'
import mongoose from 'mongoose'

async function main() {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI
    if (!uri) {
        console.error('No MONGODB_URI or MONGO_URI found in environment')
        process.exit(2)
    }
    try {
        // mask credentials for log display
        const masked = uri.replace(/(mongodb\\+srv:\/\/[^:]+):.*/, '$1:***')
        console.log('Testing MongoDB connection to:', masked)
        const opts = {
            serverSelectionTimeoutMS: 60000,
            connectTimeoutMS: 60000,
            useNewUrlParser: true,
            useUnifiedTopology: true,
        }
        await mongoose.connect(uri, opts)
        console.log('Connected OK')
        await mongoose.disconnect()
        process.exit(0)
    } catch (err) {
        console.error('Connection failed:', err && err.message ? err.message : err)
        if (err && err.reason) console.error('Reason:', err.reason)
        process.exit(1)
    }
}

main()
