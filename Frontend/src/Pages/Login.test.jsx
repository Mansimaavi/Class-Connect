import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Login from "./Login";

const auth = {
  login: vi.fn(),
  verifyTwoFactor: vi.fn(),
  isLoggedIn: false,
  user: null,
  sessionMessage: "",
};

vi.mock("../Components/AuthComponents/AuthContext", () => ({ useAuth: () => auth }));

const renderLogin = () =>
  render(
    <MemoryRouter initialEntries={["/login"]}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<p>dashboard page</p>} />
      </Routes>
    </MemoryRouter>
  );

const fillCredentials = () => {
  fireEvent.change(screen.getByLabelText("Email or username"), { target: { value: "mansi" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "Passw0rd!" } });
  fireEvent.click(screen.getByRole("button", { name: "Log in" }));
};

describe("<Login />", () => {
  beforeEach(() => {
    auth.login.mockReset();
    auth.verifyTwoFactor.mockReset();
  });

  it("signs in and goes to the dashboard", async () => {
    auth.login.mockResolvedValue({ user: { role: "user" } });
    renderLogin();
    fillCredentials();

    await waitFor(() => expect(screen.getByText("dashboard page")).toBeInTheDocument());
    expect(auth.login).toHaveBeenCalledWith("mansi", "Passw0rd!");
  });

  it("asks for an authenticator code when 2FA is on", async () => {
    auth.login.mockResolvedValue({ requiresTwoFactor: true, twoFactorToken: "challenge" });
    auth.verifyTwoFactor.mockResolvedValue({ user: { role: "user" } });
    renderLogin();
    fillCredentials();

    const codeInput = await screen.findByLabelText("Authentication code");
    fireEvent.change(codeInput, { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Verify" }));

    await waitFor(() => expect(screen.getByText("dashboard page")).toBeInTheDocument());
    expect(auth.verifyTwoFactor).toHaveBeenCalledWith("challenge", "123456");
  });

  it("shows the server's error message", async () => {
    auth.login.mockRejectedValue({ response: { data: { message: "Incorrect email/username or password" } } });
    renderLogin();
    fillCredentials();

    expect(await screen.findByRole("alert")).toHaveTextContent("Incorrect email/username or password");
  });
});
