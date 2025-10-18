import mongoose from "mongoose";

const connectDB = async () => {
    // support either MONGODB_URI or MONGO_URI (some platforms use different names)
    const raw = process.env.MONGODB_URI || process.env.MONGO_URI || ''
    if (!raw) {
        console.error('No MongoDB connection string found in MONGODB_URI or MONGO_URI')
        return
    }

    // Use the provided connection string as-is. Do not append a database name blindly
    // because the string may already contain the DB and query params (and appending
    // can produce an invalid URI). If you want a different DB name, provide a full
    // connection string that includes it.
    const uri = raw

    mongoose.connection.on('connected', () => console.log("Database Connected"))

    try {
        // Increase server selection timeout to 30s to allow slower network/dns
        const opts = {
            serverSelectionTimeoutMS: 30000,
            connectTimeoutMS: 30000,
        }
        await mongoose.connect(uri, opts)
        console.log('MongoDB connection established')
    } catch (err) {
        console.error('Failed to connect to MongoDB:', err && err.message ? err.message : err)
        // include more info for debugging (non-sensitive)
        if (uri && !uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
            console.error('MongoDB URI does not start with mongodb:// or mongodb+srv://')
        }
        throw err
    }

}

export default connectDB;

// Note: If you see a MongoParseError complaining about the scheme, verify that
// your connection string starts with "mongodb://" or "mongodb+srv://" and that
// you set the correct env var name in your hosting provider (MONGODB_URI or MONGO_URI).