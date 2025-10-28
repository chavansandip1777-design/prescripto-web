import { createContext } from "react";


export const AppContext = createContext()

const AppContextProvider = (props) => {

    const currency = import.meta.env.VITE_CURRENCY
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

    // Function to format the date eg. ( 20_01_2000 => 20 Jan 2000 )
<<<<<<< HEAD
    // Note: stored slotDate uses 1-based month (e.g. 10 for October), so subtract 1 for array index
    const slotDateFormat = (slotDate) => {
        const dateArray = slotDate.split('_')
        const monthIndex = Number(dateArray[1]) - 1
        const monthName = months[monthIndex] || months[0]
        return dateArray[0] + " " + monthName + " " + dateArray[2]
=======
    const slotDateFormat = (slotDate) => {
        if (!slotDate || typeof slotDate !== 'string' || !slotDate.includes('_')) return slotDate
        const dateArray = slotDate.split('_')
        const day = dateArray[0]
        // incoming format uses 1-based months (1 = Jan) so subtract 1 to index the array
        const monthIndex = Math.max(0, Math.min(11, Number(dateArray[1]) - 1))
        const year = dateArray[2]
        return `${day} ${months[monthIndex]} ${year}`
>>>>>>> 2554fc4 (add floder)
    }

    // Function to calculate the age eg. ( 20_01_2000 => 24 )
    const calculateAge = (dob) => {
        const today = new Date()
        const birthDate = new Date(dob)
        let age = today.getFullYear() - birthDate.getFullYear()
        return age
    }

    const value = {
        backendUrl,
        currency,
        slotDateFormat,
        calculateAge,
    }

    return (
        <AppContext.Provider value={value}>
            {props.children}
        </AppContext.Provider>
    )

}

export default AppContextProvider