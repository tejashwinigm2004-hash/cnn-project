import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyD0rBAf-BYafkcG_TlM0IxM_fADyrPVL20",
  authDomain: "cnn-project-2004.firebaseapp.com",
  projectId: "cnn-project-2004",
  storageBucket: "cnn-project-2004.firebasestorage.app",
  messagingSenderId: "668916910924",
  appId: "1:668916910924:web:fea6b945d4905d29cd1de9",
  measurementId: "G-V8RM1BGDR8",
};

const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);