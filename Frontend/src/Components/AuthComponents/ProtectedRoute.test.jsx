import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import ProtectedRoute from "./ProtectedRoute";

let auth = { isLoggedIn: false, user: null };
vi.mock("./AuthContext", () => ({ useAuth: () => auth }));

const renderAt = (roles) =>
  render(
    <MemoryRouter initialEntries={["/admin"]}>
      <Routes>
        <Route path="/login" element={<p>login page</p>} />
        <Route path="/dashboard" element={<p>dashboard page</p>} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={roles}>
              <p>secret admin page</p>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  );

describe("<ProtectedRoute />", () => {
  it("sends signed-out visitors to the login page", () => {
    auth = { isLoggedIn: false, user: null };
    renderAt();
    expect(screen.getByText("login page")).toBeInTheDocument();
  });

  it("sends users without the right role to their dashboard", () => {
    auth = { isLoggedIn: true, user: { role: "user" } };
    renderAt(["admin", "superadmin"]);
    expect(screen.getByText("dashboard page")).toBeInTheDocument();
  });

  it("renders the page for allowed roles", () => {
    auth = { isLoggedIn: true, user: { role: "admin" } };
    renderAt(["admin", "superadmin"]);
    expect(screen.getByText("secret admin page")).toBeInTheDocument();
  });
});
