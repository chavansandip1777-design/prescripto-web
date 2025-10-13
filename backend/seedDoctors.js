import mongoose from "mongoose";
import dotenv from "dotenv";
import doctorModel from "./models/doctorModel.js";

dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Dummy doctor data
const doctorsData = [
  {
    name: "Dr. Mitchell David",
    email: "mitchell.david@example.com",
    password: "$2a$10$gy5bxVSJJ5sHBDRNzZ1s7.4.RdHNZJFcMmGSDPZHW9fhOJrnj7Eti", // hashed "password123"
    image: "https://res.cloudinary.com/dxgbxchqm/image/upload/v1698394471/doctor1_ixgvkp.jpg",
    speciality: "Dermatologist",
    degree: "MBBS",
    experience: "3 Years",
    about: "Dr. Mitchell David is a skilled dermatologist with 3 years of experience in diagnosing and treating a wide range of skin, hair, and nail disorders. He holds an MBBS degree, providing him with a strong foundation in general medicine, which he integrates into his dermatological practice.",
    available: true,
    fees: 1100,
    slots_booked: {},
    address: {
      street: "123 Medical Plaza",
      city: "New York",
      state: "NY",
      zipcode: "10001"
    },
    date: Date.now()
  },
  {
    name: "Dr. Sarah Johnson",
    email: "sarah.johnson@example.com",
    password: "$2a$10$gy5bxVSJJ5sHBDRNzZ1s7.4.RdHNZJFcMmGSDPZHW9fhOJrnj7Eti", // hashed "password123"
    image: "https://res.cloudinary.com/dxgbxchqm/image/upload/v1698394471/doctor2_ixgvkp.jpg",
    speciality: "Cardiologist",
    degree: "MD, DM",
    experience: "8 Years",
    about: "Dr. Sarah Johnson is a board-certified cardiologist with 8 years of experience in treating heart conditions. She specializes in preventive cardiology and heart failure management, providing comprehensive care for patients with various cardiovascular diseases.",
    available: true,
    fees: 1500,
    slots_booked: {},
    address: {
      street: "456 Heart Center",
      city: "Boston",
      state: "MA",
      zipcode: "02108"
    },
    date: Date.now()
  },
  {
    name: "Dr. James Wilson",
    email: "james.wilson@example.com",
    password: "$2a$10$gy5bxVSJJ5sHBDRNzZ1s7.4.RdHNZJFcMmGSDPZHW9fhOJrnj7Eti", // hashed "password123"
    image: "https://res.cloudinary.com/dxgbxchqm/image/upload/v1698394471/doctor3_ixgvkp.jpg",
    speciality: "Orthopedic Surgeon",
    degree: "MBBS, MS",
    experience: "10 Years",
    about: "Dr. James Wilson is an experienced orthopedic surgeon specializing in joint replacements and sports injuries. With 10 years of practice, he has helped numerous patients regain mobility and improve their quality of life through surgical and non-surgical treatments.",
    available: true,
    fees: 2000,
    slots_booked: {},
    address: {
      street: "789 Ortho Clinic",
      city: "Chicago",
      state: "IL",
      zipcode: "60601"
    },
    date: Date.now()
  }
];

// Function to seed doctors
const seedDoctors = async () => {
  try {
    // Clear existing doctors
    await doctorModel.deleteMany({});
    console.log("Cleared existing doctors");

    // Insert new doctors
    const insertedDoctors = await doctorModel.insertMany(doctorsData);
    console.log(`Added ${insertedDoctors.length} doctors to the database`);

    // Close the connection
    mongoose.connection.close();
    console.log("Database connection closed");
  } catch (error) {
    console.error("Error seeding doctors:", error);
    mongoose.connection.close();
  }
};

// Run the seeding function
seedDoctors();