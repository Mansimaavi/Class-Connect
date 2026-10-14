import { Link } from "react-router-dom";
import NavbarComponent from "../Components/Navbar.jsx";

const NotFound = () => (
  <>
    <NavbarComponent />
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="text-6xl font-extrabold text-orange-500">404</p>
      <h1 className="text-2xl font-bold text-gray-800">This page doesn&apos;t exist</h1>
      <p className="text-gray-500">The link may be broken, or the page may have moved.</p>
      <Link to="/" className="mt-2 rounded-lg bg-orange-500 px-5 py-2 font-semibold text-white no-underline hover:bg-orange-600">
        Go home
      </Link>
    </div>
  </>
);

export default NotFound;
