import dotenv from 'dotenv';
import { initializeApp } from "firebase/app";

dotenv.config();

const firebaseConfig = {

    apiKey: "AIzaSyCp_G1gLGTutTUvds1V5jtuDugQivDygLA",
  
    authDomain: "kct-final-year.firebaseapp.com",
  
    projectId: "kct-final-year",
  
    storageBucket: "kct-final-year.appspot.com",
  
    messagingSenderId: "673266487343",
  
    appId: "1:673266487343:web:288379096bc1af713376da"
  
  };
  

// Gets port from Heroku
const PORT = process.env.PORT;

const firebaseApp = initializeApp(firebaseConfig);

const env = { firebaseConfig, PORT, firebaseApp }
export default env
