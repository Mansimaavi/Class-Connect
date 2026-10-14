import { Suspense, lazy } from "react";
import { Navigate, Route, Routes, useParams } from "react-router-dom";
import ProtectedRoute from "./Components/AuthComponents/ProtectedRoute.jsx";
import RegisterVerification from "./Components/AuthComponents/RegisterVerification.jsx";
import Classroom from "./Pages/Classroom.jsx";
import Dashboard from "./Pages/Dashboard.jsx";
import ForgotPassword from "./Pages/ForgotPassword.jsx";
import Home from "./Pages/Home.jsx";
import Login from "./Pages/Login.jsx";
import NotFound from "./Pages/NotFound.jsx";
import Register from "./Pages/Register.jsx";
import ResetPassword from "./Pages/ResetPassword.jsx";

// Heavier pages (charts, maps, MUI, emoji picker) load on demand.
const AdminDashboard = lazy(() => import("./Pages/Admin.jsx"));
const ChatRoom = lazy(() => import("./Components/ChatComponents/ChatRoom.jsx"));
const ClassNotes = lazy(() => import("./Pages/ClassNotes.jsx"));
const Profile = lazy(() => import("./Pages/Profile.jsx"));
const DiscussionBox = lazy(() => import("./Components/DiscussionComponents/Discussion.jsx"));
const ShowAllAnswersPage = lazy(() => import("./Components/DiscussionComponents/ShowAllAnswersPage.jsx"));
const AddAnswerPage = lazy(() => import("./Components/DiscussionComponents/AddAnswerPage.jsx"));

const PageLoader = () => (
  <div className="flex min-h-[60vh] items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" aria-label="Loading" />
  </div>
);

// Links shared before classrooms were renamed from "folders" keep working.
const LegacyFolderRedirect = ({ chat = false }) => {
  const { folderId } = useParams();
  return <Navigate to={`/classroom/${folderId}${chat ? "/chat" : ""}`} replace />;
};

const protect = (element, roles) => <ProtectedRoute roles={roles}>{element}</ProtectedRoute>;

function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/register-verification" element={<RegisterVerification />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />

        <Route path="/dashboard" element={protect(<Dashboard />)} />
        <Route path="/classroom/:classroomId" element={protect(<Classroom />)} />
        <Route path="/classroom/:classroomId/chat" element={protect(<ChatRoom />)} />
        <Route path="/profile/:userId" element={protect(<Profile />)} />
        <Route path="/admin" element={protect(<AdminDashboard />, ["admin", "superadmin"])} />

        <Route path="/discussion" element={<DiscussionBox />} />
        <Route path="/answers/:questionId" element={<ShowAllAnswersPage />} />
        <Route path="/add-answer/:questionId" element={protect(<AddAnswerPage />)} />
        <Route path="/class-notes" element={<ClassNotes />} />

        <Route path="/folder/:folderId" element={<LegacyFolderRedirect />} />
        <Route path="/chatroom/:folderId" element={<LegacyFolderRedirect chat />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

export default App;
