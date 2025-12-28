import {  Routes, Route } from 'react-router-dom';
import Home from "./Pages/Home.jsx"
import Register from './Pages/Register.jsx';
import Dashboard from './Pages/Dashboard.jsx';
import AdminDashboard from "./Pages/Admin.jsx";
import Profile from "./Pages/profile.jsx";
import Folder from "./Pages/Folder.jsx";
import Login from './Pages/Login.jsx';
import DiscussionBox from './Components/DiscussionComponents/Discussion.jsx';
import ChatRoom from './Components/ChatComponents/chatRoom.jsx';
import RegisterVerification from "./Components/AuthComponents/RegisterVerification.jsx";
import ClassNotes from "./Pages/ClassNotes"; 
import AddAnswerPage from './Components/DiscussionComponents/AddAnswerPage.jsx'; 
import ShowAllAnswersPage from './Components/DiscussionComponents/ShowAllAnswersPage.jsx'; 
import { useAuth } from './Components/AuthComponents/AuthContext.jsx';


// ProtectedRoute: Redirects to login if user is not authenticated
function ProtectedRoute({ children }) {
  const { isLoggedIn } = useAuth();
  if (isLoggedIn === null) {
    // Avoid flashing by showing nothing until state is determined
    return null; 
  }
  return isLoggedIn ? children : <Navigate to="/login" replace />;
}

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} /> 
        <Route path="/register" element={<Register />} /> 
        <Route path="/dashboard" element={<Dashboard />} /> 
        <Route path="/folder/:folderId" element={<Folder/>} />
        <Route path="/admin" element={<AdminDashboard/>} />
        <Route path="/register-verification" element={<RegisterVerification />} />
        <Route path="/profile/:userId" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/login" element={<Login />} />
        <Route path="/discussion" element={<DiscussionBox />} />
        <Route path="/chatroom/:folderId" element={<ChatRoom />} />
        <Route path="/folder/:folderId" element={<Folder />} />
        <Route path="/class-notes" element={<ClassNotes />} />
        <Route path="/add-answer/:questionId" element={<AddAnswerPage />} />
        <Route path="/answers/:questionId" element={<ShowAllAnswersPage />} />
      </Routes>
    </>
  )
}

export default App