import axios from "axios";
import { createContext, useState } from "react";
import { toast } from "react-toastify";


export const AdminContext = createContext()

const AdminContextProvider = (props) => {

    // fallback to local backend if env var missing (backend is running on 5000)
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'

    const [aTokenState, setATokenState] = useState(localStorage.getItem('aToken') ? localStorage.getItem('aToken') : '')
    const aToken = aTokenState

    // wrapper to keep axios header in sync
    const setAToken = (token) => {
        setATokenState(token)
        if (token) {
            axios.defaults.headers.common['aToken'] = token
            localStorage.setItem('aToken', token)
        } else {
            delete axios.defaults.headers.common['aToken']
            localStorage.removeItem('aToken')
        }
    }

    // ensure header synced initially
    if (aToken) axios.defaults.headers.common['aToken'] = aToken

    const [appointments, setAppointments] = useState([])
    const [doctors, setDoctors] = useState([])
    const [dashData, setDashData] = useState(false)

    // Getting all Doctors data from Database using API
    const getAllDoctors = async () => {

        try {

            const { data } = await axios.get(backendUrl + '/api/admin/all-doctors', { headers: { aToken } })
            if (data.success) {
                setDoctors(data.doctors)
            } else {
                toast.error(data.message)
            }

        } catch (error) {
            toast.error(error.message)
        }

    }

    // Auto-login in dev if no token and VITE_ADMIN_EMAIL is provided
    const tryAutoLogin = async () => {
        if (aToken) return
        const viteEmail = import.meta.env.VITE_ADMIN_EMAIL
        const vitePass = import.meta.env.VITE_ADMIN_PASSWORD
        if (viteEmail && vitePass) {
            try {
                const { data } = await axios.post((import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000') + '/api/admin/login', { email: viteEmail, password: vitePass })
                if (data.success) {
                    setAToken(data.token)
                    localStorage.setItem('aToken', data.token)
                    axios.defaults.headers.common['aToken'] = data.token
                }
            } catch (err) {
                // ignore
            }
        }
    }

    // attempt auto-login on load
    tryAutoLogin()

    // Function to change doctor availablity using API
    const changeAvailability = async (docId) => {
        try {

            const { data } = await axios.post(backendUrl + '/api/admin/change-availability', { docId }, { headers: { aToken } })
            if (data.success) {
                toast.success(data.message)
                getAllDoctors()
            } else {
                toast.error(data.message)
            }

        } catch (error) {
            console.log(error)
            toast.error(error.message)
        }
    }


    // Getting all appointment data from Database using API
    const getAllAppointments = async () => {

        try {

            const { data } = await axios.get(backendUrl + '/api/admin/appointments', { headers: { aToken } })
            if (data.success) {
                setAppointments(data.appointments.reverse())
            } else {
                toast.error(data.message)
            }

        } catch (error) {
            toast.error(error.message)
            console.log(error)
        }

    }

    // Function to cancel appointment using API
    const cancelAppointment = async (appointmentId) => {

        try {

            const { data } = await axios.post(backendUrl + '/api/admin/cancel-appointment', { appointmentId }, { headers: { aToken } })

            if (data.success) {
                toast.success(data.message)
                getAllAppointments()
            } else {
                toast.error(data.message)
            }

        } catch (error) {
            toast.error(error.message)
            console.log(error)
        }

    }

    // Getting Admin Dashboard data from Database using API
    const getDashData = async () => {
        try {

            const { data } = await axios.get(backendUrl + '/api/admin/dashboard', { headers: { aToken } })

            if (data.success) {
                setDashData(data.dashData)
            } else {
                toast.error(data.message)
            }

        } catch (error) {
            console.log(error)
            toast.error(error.message)
        }

    }

    // get and update settings
    const getSettings = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/admin/settings', { headers: { aToken } })
            if (data.success) return data.settings
            toast.error(data.message)
        } catch (error) {
            toast.error(error.message)
        }
    }

    const updateSettings = async (payload) => {
        try {
            const { data } = await axios.post(backendUrl + '/api/admin/settings', payload, { headers: { aToken } })
            if (data.success) {
                toast.success('Settings updated')
                return true
            }
            toast.error(data.message)
            return false
        } catch (error) {
            toast.error(error.message)
            return false
        }
    }

    const value = {
        aToken, setAToken,
        doctors,
        getAllDoctors,
        changeAvailability,
        getSettings, updateSettings,
        appointments,
        getAllAppointments,
        getDashData,
        cancelAppointment,
        dashData
    }

    return (
        <AdminContext.Provider value={value}>
            {props.children}
        </AdminContext.Provider>
    )

}

export default AdminContextProvider