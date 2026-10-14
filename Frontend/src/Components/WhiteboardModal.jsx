import { useCallback, useEffect, useRef, useState } from "react";
import { getSocket } from "../lib/socket";
import api, { getErrorMessage } from "../lib/api";

// Every client draws on the same logical canvas size and scales the pointer
// position into it, so drawings line up on screens of any size.
const CANVAS_WIDTH = 1600;
const CANVAS_HEIGHT = 900;
const BACKGROUND = "#ffffff";

const TOOLS = [
  { id: "pen", name: "Pen" },
  { id: "eraser", name: "Eraser" },
  { id: "line", name: "Line" },
  { id: "rectangle", name: "Rectangle" },
  { id: "circle", name: "Circle" },
  { id: "text", name: "Text" },
  { id: "fill", name: "Fill" },
];

const newStrokeId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const hexToRgba = (hex) => {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || "");
  return match ? [parseInt(match[1], 16), parseInt(match[2], 16), parseInt(match[3], 16), 255] : [0, 0, 0, 255];
};

const floodFill = (context, startX, startY, color) => {
  const x0 = Math.round(startX);
  const y0 = Math.round(startY);
  if (x0 < 0 || y0 < 0 || x0 >= CANVAS_WIDTH || y0 >= CANVAS_HEIGHT) return;
  const image = context.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  const { data } = image;
  const at = (x, y) => (y * CANVAS_WIDTH + x) * 4;
  const start = at(x0, y0);
  const target = [data[start], data[start + 1], data[start + 2], data[start + 3]];
  const fill = hexToRgba(color);
  if (target.every((value, i) => value === fill[i])) return;

  const matches = (index) =>
    data[index] === target[0] && data[index + 1] === target[1] && data[index + 2] === target[2] && data[index + 3] === target[3];
  const stack = [[x0, y0]];
  while (stack.length) {
    const [x, y] = stack.pop();
    const index = at(x, y);
    if (!matches(index)) continue;
    data[index] = fill[0];
    data[index + 1] = fill[1];
    data[index + 2] = fill[2];
    data[index + 3] = fill[3];
    if (x > 0) stack.push([x - 1, y]);
    if (x < CANVAS_WIDTH - 1) stack.push([x + 1, y]);
    if (y > 0) stack.push([x, y - 1]);
    if (y < CANVAS_HEIGHT - 1) stack.push([x, y + 1]);
  }
  context.putImageData(image, 0, 0);
};

const drawElement = (context, element) => {
  context.save();
  context.lineCap = "round";
  context.lineJoin = "round";
  context.strokeStyle = element.color;
  context.lineWidth = element.brushSize || 2;

  switch (element.type) {
    case "draw":
    case "line":
      context.beginPath();
      context.moveTo(element.x1, element.y1);
      context.lineTo(element.x2, element.y2);
      context.stroke();
      break;
    case "rectangle":
      context.beginPath();
      context.rect(element.x1, element.y1, element.x2 - element.x1, element.y2 - element.y1);
      if (element.fill) {
        context.fillStyle = element.fillColor;
        context.fill();
      }
      context.stroke();
      break;
    case "circle": {
      const radius = Math.hypot(element.x2 - element.x1, element.y2 - element.y1);
      context.beginPath();
      context.arc(element.x1, element.y1, radius, 0, 2 * Math.PI);
      if (element.fill) {
        context.fillStyle = element.fillColor;
        context.fill();
      }
      context.stroke();
      break;
    }
    case "text":
      context.fillStyle = element.color;
      context.font = `${element.fontSize || 24}px Arial`;
      context.fillText(element.text, element.x, element.y);
      break;
    case "fill":
      floodFill(context, element.x, element.y, element.color);
      break;
    default:
      break;
  }
  context.restore();
};

/** Removes the most recent action (a whole pen stroke counts as one). */
const splitLastAction = (elements) => {
  if (!elements.length) return [elements, []];
  const last = elements[elements.length - 1];
  if (!last.strokeId) return [elements.slice(0, -1), [last]];
  let start = elements.length - 1;
  while (start > 0 && elements[start - 1].strokeId === last.strokeId) start -= 1;
  return [elements.slice(0, start), elements.slice(start)];
};

const WhiteboardModal = ({ isOpen, onClose, roomId, title = "Collaborative whiteboard" }) => {
  const canvasRef = useRef(null);
  const elementsRef = useRef([]);
  const redoStackRef = useRef([]);
  const drawingRef = useRef(null); // { tool, strokeId, lastX, lastY, startX, startY }

  const [tool, setTool] = useState("pen");
  const [color, setColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(4);
  const [eraserSize, setEraserSize] = useState(20);
  const [fillShapes, setFillShapes] = useState(false);
  const [fillColor, setFillColor] = useState("#ffd8a8");
  const [textPosition, setTextPosition] = useState(null);
  const [textInput, setTextInput] = useState("");
  const [status, setStatus] = useState("");

  const context = () => canvasRef.current?.getContext("2d");

  const redraw = useCallback((preview) => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = BACKGROUND;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    elementsRef.current.forEach((element) => drawElement(ctx, element));
    if (preview) drawElement(ctx, preview);
  }, []);

  const persist = useCallback(
    async (elements) => {
      try {
        await api.put(`/whiteboards/${roomId}`, { elements });
      } catch (err) {
        setStatus(getErrorMessage(err, "Couldn't save the whiteboard."));
      }
    },
    [roomId]
  );

  useEffect(() => {
    if (!isOpen || !roomId) return undefined;
    const socket = getSocket();
    let active = true;
    elementsRef.current = [];
    redoStackRef.current = [];
    redraw();
    setStatus("Loading…");

    api
      .get(`/whiteboards/${roomId}`)
      .then(({ data }) => {
        if (!active) return;
        elementsRef.current = data.elements || [];
        redraw();
        setStatus("");
      })
      .catch((err) => active && setStatus(getErrorMessage(err, "Couldn't load the whiteboard.")));

    const join = () => socket.emit("whiteboard:join", roomId, () => {});
    const onElement = ({ roomId: id, element }) => {
      if (id !== roomId) return;
      elementsRef.current.push(element);
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) drawElement(ctx, element);
    };
    const onCleared = ({ roomId: id }) => {
      if (id !== roomId) return;
      elementsRef.current = [];
      redraw();
    };
    const onReplaced = ({ roomId: id, elements }) => {
      if (id !== roomId) return;
      elementsRef.current = elements;
      redraw();
    };

    socket.on("connect", join);
    socket.on("whiteboard:element", onElement);
    socket.on("whiteboard:cleared", onCleared);
    socket.on("whiteboard:replaced", onReplaced);
    if (socket.connected) join();

    return () => {
      active = false;
      socket.emit("whiteboard:leave", roomId);
      socket.off("connect", join);
      socket.off("whiteboard:element", onElement);
      socket.off("whiteboard:cleared", onCleared);
      socket.off("whiteboard:replaced", onReplaced);
    };
  }, [isOpen, roomId, redraw]);

  const addElement = (element) => {
    elementsRef.current.push(element);
    redoStackRef.current = [];
    const ctx = context();
    if (ctx) drawElement(ctx, element);
    getSocket().emit("whiteboard:element", { roomId, element });
  };

  const pointerPosition = (event) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: Math.round(((event.clientX - rect.left) / rect.width) * CANVAS_WIDTH),
      y: Math.round(((event.clientY - rect.top) / rect.height) * CANVAS_HEIGHT),
    };
  };

  const strokeStyle = () =>
    tool === "eraser"
      ? { color: BACKGROUND, brushSize: Number(eraserSize) }
      : { color, brushSize: Number(brushSize) };

  const handlePointerDown = (event) => {
    const { x, y } = pointerPosition(event);
    if (tool === "text") {
      setTextPosition({ x, y });
      return;
    }
    if (tool === "fill") {
      addElement({ type: "fill", x, y, color });
      return;
    }
    canvasRef.current.setPointerCapture?.(event.pointerId);
    drawingRef.current = { strokeId: newStrokeId(), lastX: x, lastY: y, startX: x, startY: y };
  };

  const handlePointerMove = (event) => {
    const drawing = drawingRef.current;
    if (!drawing) return;
    const { x, y } = pointerPosition(event);

    if (tool === "pen" || tool === "eraser") {
      if (x === drawing.lastX && y === drawing.lastY) return;
      addElement({ type: "draw", x1: drawing.lastX, y1: drawing.lastY, x2: x, y2: y, strokeId: drawing.strokeId, ...strokeStyle() });
      drawing.lastX = x;
      drawing.lastY = y;
    } else {
      redraw({ type: tool, x1: drawing.startX, y1: drawing.startY, x2: x, y2: y, fill: fillShapes, fillColor, ...strokeStyle() });
    }
  };

  const handlePointerUp = (event) => {
    const drawing = drawingRef.current;
    drawingRef.current = null;
    if (!drawing || tool === "pen" || tool === "eraser") return;
    const { x, y } = pointerPosition(event);
    if (x === drawing.startX && y === drawing.startY) {
      redraw();
      return;
    }
    redraw();
    addElement({
      type: tool,
      x1: drawing.startX,
      y1: drawing.startY,
      x2: x,
      y2: y,
      fill: fillShapes && tool !== "line",
      fillColor,
      ...strokeStyle(),
    });
  };

  const handleTextSubmit = (event) => {
    event.preventDefault();
    if (!textInput.trim() || !textPosition) return;
    addElement({ type: "text", x: textPosition.x, y: textPosition.y, text: textInput.trim().slice(0, 300), color, fontSize: 16 + Number(brushSize) * 2 });
    setTextInput("");
    setTextPosition(null);
  };

  const undo = () => {
    const [remaining, removed] = splitLastAction(elementsRef.current);
    if (!removed.length) return;
    elementsRef.current = remaining;
    redoStackRef.current.push(removed);
    redraw();
    persist(remaining);
  };

  const redo = () => {
    const restored = redoStackRef.current.pop();
    if (!restored) return;
    elementsRef.current = [...elementsRef.current, ...restored];
    redraw();
    persist(elementsRef.current);
  };

  const clear = () => {
    if (!window.confirm("Clear the whole board for everyone?")) return;
    elementsRef.current = [];
    redoStackRef.current = [];
    redraw();
    getSocket().emit("whiteboard:clear", { roomId });
  };

  const download = () => {
    const link = document.createElement("a");
    link.download = "whiteboard.png";
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true">
      <div className="max-h-[95vh] w-11/12 max-w-6xl overflow-auto rounded-lg bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="mb-0 text-2xl font-bold">{title}</h2>
          <div className="flex items-center gap-4">
            {status && <span className="text-sm text-gray-500">{status}</span>}
            <button onClick={onClose} className="text-xl text-gray-500 hover:text-gray-700" aria-label="Close whiteboard">
              ✕
            </button>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-4">
          <div className="flex flex-wrap gap-2">
            {TOOLS.map((option) => (
              <button
                key={option.id}
                onClick={() => {
                  setTool(option.id);
                  setTextPosition(null);
                }}
                className={`rounded px-3 py-1 ${tool === option.id ? "bg-blue-500 text-white" : "bg-gray-200"}`}
              >
                {option.name}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2">
            Color
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-9 w-10 cursor-pointer" />
          </label>

          {tool === "eraser" ? (
            <label className="flex items-center gap-2">
              Eraser
              <input type="range" min="5" max="80" value={eraserSize} onChange={(e) => setEraserSize(e.target.value)} className="w-24" />
            </label>
          ) : (
            <label className="flex items-center gap-2">
              Size
              <input type="range" min="1" max="30" value={brushSize} onChange={(e) => setBrushSize(e.target.value)} className="w-24" />
              <span className="w-6 text-sm">{brushSize}</span>
            </label>
          )}

          {(tool === "rectangle" || tool === "circle") && (
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={fillShapes} onChange={(e) => setFillShapes(e.target.checked)} />
              Fill
              {fillShapes && <input type="color" value={fillColor} onChange={(e) => setFillColor(e.target.value)} className="h-8 w-8 cursor-pointer" />}
            </label>
          )}

          <div className="ml-auto flex flex-wrap gap-2">
            <button onClick={undo} className="rounded bg-gray-500 px-4 py-2 text-white hover:bg-gray-600">
              Undo
            </button>
            <button onClick={redo} className="rounded bg-gray-500 px-4 py-2 text-white hover:bg-gray-600">
              Redo
            </button>
            <button onClick={download} className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
              Save PNG
            </button>
            <button onClick={clear} className="rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600">
              Clear
            </button>
          </div>
        </div>

        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={(e) => drawingRef.current && handlePointerUp(e)}
          className="w-full touch-none border border-gray-300"
          style={{ aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}`, cursor: tool === "text" ? "text" : "crosshair" }}
        />

        {tool === "text" && textPosition && (
          <form onSubmit={handleTextSubmit} className="mt-2 flex items-center gap-2">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              className="rounded border p-2"
              placeholder="Type text, then press Add"
              maxLength={300}
              autoFocus
            />
            <button type="submit" className="rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600">
              Add text
            </button>
            <button type="button" onClick={() => setTextPosition(null)} className="rounded bg-gray-500 px-4 py-2 text-white hover:bg-gray-600">
              Cancel
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default WhiteboardModal;
