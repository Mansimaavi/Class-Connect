import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";  
import store from "./app/store"; 
import { BrowserRouter as Router } from "react-router-dom"; 
import { AuthProvider } from "./Components/AuthComponents/AuthContext.jsx"; 
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "./index.css";
import App from "./App.jsx";
import TimeAgo from "javascript-time-ago";
import en from "javascript-time-ago/locale/en.json";

TimeAgo.addDefaultLocale(en); 

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Provider store={store}> 
      <Router>
        <AuthProvider> 
          <App />
        </AuthProvider>
      </Router>
    </Provider>
  </StrictMode>
);
