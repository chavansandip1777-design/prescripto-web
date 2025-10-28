import { createContext, useEffect, useState } from "react";
import { toast } from "react-toastify";
import axios from 'axios'

export const AppContext = createContext()

const AppContextProvider = (props) => {

    const currencySymbol = '₹'
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'

    const [doctors, setDoctors] = useState([])
<<<<<<< HEAD
    const [loadingCount, setLoadingCount] = useState(0)
    const isLoading = loadingCount > 0
    const [token, setToken] = useState(localStorage.getItem('token') ? localStorage.getItem('token') : '')
    const [userData, setUserData] = useState(false)

    // Global axios interceptors to track in-flight requests and show loaders
    useEffect(() => {
        const reqInterceptor = axios.interceptors.request.use(config => {
            setLoadingCount(c => c + 1)
            return config
        }, err => {
            setLoadingCount(c => Math.max(0, c - 1))
            return Promise.reject(err)
        })

        const resInterceptor = axios.interceptors.response.use(resp => {
            setLoadingCount(c => Math.max(0, c - 1))
            return resp
        }, err => {
            setLoadingCount(c => Math.max(0, c - 1))
            return Promise.reject(err)
        })

        return () => {
            axios.interceptors.request.eject(reqInterceptor)
            axios.interceptors.response.eject(resInterceptor)
        }
    }, [])

=======
    const [token, setToken] = useState(localStorage.getItem('token') ? localStorage.getItem('token') : '')
    const [userData, setUserData] = useState(false)

>>>>>>> 2554fc4 (add floder)
    // Getting Doctors using API
    const getDoctosData = async () => {

        try {

            const { data } = await axios.get(backendUrl + '/api/doctor/list')
            if (data.success) {
                setDoctors(data.doctors)
            } else {
                toast.error(data.message)
            }

        } catch (error) {
            console.log(error)
            toast.error(error.message)
        }

    }

    // Getting User Profile using API
    const loadUserProfileData = async () => {

        try {

            const { data } = await axios.get(backendUrl + '/api/user/get-profile', { headers: { token } })

            if (data.success) {
                setUserData(data.userData)
            } else {
                toast.error(data.message)
            }

        } catch (error) {
            console.log(error)
            toast.error(error.message)
        }

    }

    useEffect(() => {
        getDoctosData()
    }, [])

    useEffect(() => {
        if (token) {
            loadUserProfileData()
        }
    }, [token])

    const value = {
        doctors, getDoctosData,
        currencySymbol,
        backendUrl,
        token, setToken,
        userData, setUserData, loadUserProfileData
<<<<<<< HEAD
        , isLoading
=======
>>>>>>> 2554fc4 (add floder)
    }

    return (
        <AppContext.Provider value={value}>
            {props.children}
        </AppContext.Provider>
    )

}

export default AppContextProvider