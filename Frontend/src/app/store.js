// import { configureStore } from "@reduxjs/toolkit";
// import userReducer from "../feature/userSlice";

// export default configureStore({
//   reducer: {
//     user: userReducer,
//   },
// });
import { configureStore } from "@reduxjs/toolkit";
import userReducer from "../feature/userSlice";  // Make sure this matches your file structure

const store = configureStore({
  reducer: {
    user: userReducer,
  },
});

export default store;
