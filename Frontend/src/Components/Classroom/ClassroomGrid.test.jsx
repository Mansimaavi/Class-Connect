import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ClassroomGrid from "./ClassroomGrid";

const classroom = (overrides = {}) => ({
  _id: "c1",
  name: "Operating Systems",
  subject: "CS",
  myRole: "owner",
  joinCode: "OSLAB123",
  memberCount: 5,
  members: [
    { _id: "u1", name: "Mansi Maavi" },
    { _id: "u2", name: "Riya Singh" },
    { _id: "u3", name: "Arjun" },
  ],
  progress: { total: 4, completed: 3, percentage: 75 },
  ...overrides,
});

describe("<ClassroomGrid />", () => {
  it("shows progress, member initials and the join code for owners", () => {
    render(<ClassroomGrid title="Created" classrooms={[classroom()]} onOpen={() => {}} onRemove={() => {}} />);

    expect(screen.getByText("Operating Systems")).toBeInTheDocument();
    expect(screen.getByText("75%")).toBeInTheDocument();
    expect(screen.getByText("3 of 4 files completed")).toBeInTheDocument();
    expect(screen.getByText("OSLAB123")).toBeInTheDocument();
    expect(screen.getByText("MM")).toBeInTheDocument();
    expect(screen.getByText("+2")).toBeInTheDocument();
  });

  it("hides the join code from students", () => {
    render(<ClassroomGrid title="Joined" classrooms={[classroom({ myRole: "student", joinCode: undefined })]} onOpen={() => {}} onRemove={() => {}} />);
    expect(screen.queryByText(/Join code/)).not.toBeInTheDocument();
    expect(screen.getByText("Student")).toBeInTheDocument();
  });

  it("opens a classroom on click without triggering remove", () => {
    const onOpen = vi.fn();
    const onRemove = vi.fn();
    render(<ClassroomGrid title="Joined" classrooms={[classroom()]} onOpen={onOpen} onRemove={onRemove} removeLabel="Leave" />);

    fireEvent.click(screen.getByText("Continue"));
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onRemove).not.toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText("Leave Operating Systems"));
    expect(onRemove).toHaveBeenCalledWith(expect.objectContaining({ _id: "c1" }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("shows a helpful empty state", () => {
    render(<ClassroomGrid title="Joined" classrooms={[]} onOpen={() => {}} onRemove={() => {}} emptyMessage="Ask your teacher for a join code." />);
    expect(screen.getByText("Ask your teacher for a join code.")).toBeInTheDocument();
  });
});
