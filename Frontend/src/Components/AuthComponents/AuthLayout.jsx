import { Link } from "react-router-dom";

/** Centered card used by the sign-in, sign-up and password pages. */
const AuthLayout = ({ title, subtitle, children, footer }) => (
  <div className="flex min-h-screen items-center justify-center bg-[#F4F7FB] px-4 py-10">
    <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
      <Link to="/" className="mb-6 block text-center text-2xl font-extrabold text-orange-500 no-underline">
        ClassConnect
      </Link>
      <h1 className="mb-1 text-center text-2xl font-bold text-[#1E3A8A]">{title}</h1>
      {subtitle && <p className="mb-6 text-center text-sm text-gray-500">{subtitle}</p>}
      {children}
      {footer && <div className="mt-6 text-center text-sm text-gray-600">{footer}</div>}
    </div>
  </div>
);

export const FormError = ({ message }) =>
  message ? (
    <div role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
      {message}
    </div>
  ) : null;

export const FormSuccess = ({ message }) =>
  message ? (
    <div role="status" className="mb-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
      {message}
    </div>
  ) : null;

export const TextField = ({ label, error, id, ...props }) => (
  <div className="mb-4">
    <label htmlFor={id} className="mb-1 block text-sm font-medium text-gray-700">
      {label}
    </label>
    <input
      id={id}
      className={`w-full rounded-lg border px-3 py-2.5 outline-none focus:ring-2 focus:ring-orange-400 ${
        error ? "border-red-500" : "border-gray-300"
      }`}
      aria-invalid={Boolean(error)}
      {...props}
    />
    {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
  </div>
);

export const SubmitButton = ({ loading, disabled, children, ...props }) => (
  <button
    type="submit"
    disabled={loading || disabled}
    className="w-full rounded-lg bg-[#1E3A8A] py-2.5 font-semibold text-white transition hover:bg-[#162c69] disabled:cursor-not-allowed disabled:opacity-60"
    {...props}
  >
    {loading ? "Please wait…" : children}
  </button>
);

export default AuthLayout;
