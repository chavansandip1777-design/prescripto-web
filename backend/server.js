import express from "express"
import cors from 'cors'
import 'dotenv/config'
import connectDB from "./config/mongodb.js"
import connectCloudinary from "./config/cloudinary.js"
import userRouter from "./routes/userRoute.js"
import doctorRouter from "./routes/doctorRoute.js"
import adminRouter from "./routes/adminRoute.js"
import path from 'path'
import { fileURLToPath } from 'url'

// app config
const app = express()
const port = process.env.PORT || 4000
connectDB()
connectCloudinary()

// middlewares
app.use(express.json())
app.use(cors())

// api endpoints
app.use("/api/user", userRouter)
app.use("/api/admin", adminRouter)
app.use("/api/doctor", doctorRouter)

// Serve static frontend and admin builds if they exist (useful when deploying via a single web service)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const frontendDist = path.join(__dirname, '..', 'frontend', 'dist')
const adminDist = path.join(__dirname, '..', 'admin', 'dist')

// Serve frontend static (mounted at /)
app.use(express.static(frontendDist))

// Serve admin static under /admin (so admin URLs like /admin-dashboard can also be rewritten)
app.use(express.static(adminDist))

// SPA fallback for frontend/admin when the static file wasn't found
app.get('*', (req, res, next) => {
  // prefer admin fallback if the url path suggests admin
  try {
    const reqPath = req.path || ''
    if (reqPath.startsWith('/admin')) {
      return res.sendFile(path.join(adminDist, 'index.html'))
    }
    return res.sendFile(path.join(frontendDist, 'index.html'))
  } catch (err) {
    next()
  }
})

app.get("/", (req, res) => {
  res.send("API Working")
});

app.listen(port, () => console.log(`Server started on PORT:${port}`))