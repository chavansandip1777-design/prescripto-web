import jwt from "jsonwebtoken"

// admin authentication middleware
const authAdmin = async (req, res, next) => {
    try {
        // accept token from several common header names
        const headerToken = req.headers.atoken || req.headers['a-token'] || req.headers['x-access-token'] || (req.headers.authorization && req.headers.authorization.split(' ')[1])

        if (!headerToken) {
            console.log('authAdmin: no token found in headers', Object.keys(req.headers))
            return res.json({ success: false, message: 'Not Authorized Login Again' })
        }

        const token_decode = jwt.verify(headerToken, process.env.JWT_SECRET)
        if (token_decode !== process.env.ADMIN_EMAIL + process.env.ADMIN_PASSWORD) {
            console.log('authAdmin: invalid token decoded', token_decode)
            return res.json({ success: false, message: 'Not Authorized Login Again' })
        }
        next()
    } catch (error) {
        console.log('authAdmin error', error.message)
        res.json({ success: false, message: error.message })
    }
}

export default authAdmin;