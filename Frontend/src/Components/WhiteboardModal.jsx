import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

const WhiteboardModal = ({ isOpen, onClose, roomId }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(5);
  const [selectedTool, setSelectedTool] = useState('pen');
  const [textInput, setTextInput] = useState('');
  const [textPosition, setTextPosition] = useState(null);
  const [shapes, setShapes] = useState([]);
  const [currentShape, setCurrentShape] = useState(null);
  const [isFilling, setIsFilling] = useState(false);
  const [fillColor, setFillColor] = useState('#ffffff');
  const [eraserSize, setEraserSize] = useState(10);
  const socketRef = useRef();
  const contextRef = useRef();
  const canvasHistory = useRef([]);
  const historyIndex = useRef(-1);

  const tools = [
    { id: 'pen', name: 'Pen' },
    { id: 'eraser', name: 'Eraser' },
    { id: 'text', name: 'Text' },
    { id: 'rectangle', name: 'Rectangle' },
    { id: 'circle', name: 'Circle' },
    { id: 'line', name: 'Line' },
    { id: 'select', name: 'Select' },
    { id: 'fill', name: 'Fill' }
  ];

  useEffect(() => {
    if (!isOpen) return;

    // Initialize socket connection
    socketRef.current = io('http://localhost:5000');
    socketRef.current.emit('join-room', roomId);

    // Set up canvas
    const canvas = canvasRef.current;
    canvas.width = window.innerWidth * 0.7;
    canvas.height = window.innerHeight * 0.7;

    const context = canvas.getContext('2d');
    context.lineCap = 'round';
    context.strokeStyle = color;
    context.lineWidth = brushSize;
    contextRef.current = context;

    // Load existing whiteboard data
    fetch(`http://localhost:5000/api/whiteboard/${roomId}`)
      .then(res => res.json())
      .then(data => {
        if (data.elements && data.elements.length > 0) {
          redrawCanvas(data.elements);
          canvasHistory.current = data.elements;
          historyIndex.current = data.elements.length - 1;
        }
      });

    // Socket event listeners
    socketRef.current.on('drawing', (data) => {
      drawOnCanvas(data);
    });

    socketRef.current.on('text-added', (data) => {
      addText(data);
    });

    socketRef.current.on('shape-added', (data) => {
      addShape(data);
    });

    socketRef.current.on('cleared', () => {
      clearCanvas();
    });

    socketRef.current.on('undo', () => {
      undo();
    });

    socketRef.current.on('redo', () => {
      redo();
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [isOpen, roomId]);

  const redrawCanvas = (elements) => {
    const context = contextRef.current;
    context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    
    elements.forEach(element => {
      context.strokeStyle = element.color;
      context.lineWidth = element.brushSize;
      context.fillStyle = element.fillColor || 'transparent';
      
      switch(element.type) {
        case 'draw':
          context.beginPath();
          context.moveTo(element.x1, element.y1);
          context.lineTo(element.x2, element.y2);
          context.stroke();
          break;
        case 'text':
          context.fillStyle = element.color;
          context.font = `${element.fontSize || 16}px Arial`;
          context.fillText(element.text, element.x, element.y);
          break;
        case 'rectangle':
          context.beginPath();
          context.rect(element.x, element.y, element.width, element.height);
          if (element.fill) {
            context.fill();
          }
          context.stroke();
          break;
        case 'circle':
          context.beginPath();
          context.arc(element.x, element.y, element.radius, 0, 2 * Math.PI);
          if (element.fill) {
            context.fill();
          }
          context.stroke();
          break;
        case 'line':
          context.beginPath();
          context.moveTo(element.x1, element.y1);
          context.lineTo(element.x2, element.y2);
          context.stroke();
          break;
        case 'fill':
          floodFill(element.x, element.y, element.color);
          break;
        default:
          break;
      }
    });
  };

  const drawOnCanvas = (data) => {
    const context = contextRef.current;
    context.strokeStyle = data.color;
    context.lineWidth = data.brushSize;
    
    switch(data.type) {
      case 'draw':
        context.beginPath();
        context.moveTo(data.x1, data.y1);
        context.lineTo(data.x2, data.y2);
        context.stroke();
        break;
      case 'text':
        addText(data);
        break;
      case 'rectangle':
      case 'circle':
      case 'line':
        addShape(data);
        break;
      case 'fill':
        floodFill(data.x, data.y, data.color);
        break;
      default:
        break;
    }
  };

  const addText = ({ x, y, text, color, fontSize = 16 }) => {
    const context = contextRef.current;
    context.fillStyle = color;
    context.font = `${fontSize}px Arial`;
    context.fillText(text, x, y);
    saveToHistory();
  };

  const addShape = (shape) => {
    const context = contextRef.current;
    context.strokeStyle = shape.color;
    context.lineWidth = shape.brushSize;
    context.fillStyle = shape.fillColor || 'transparent';
    
    switch(shape.type) {
      case 'rectangle':
        context.beginPath();
        context.rect(shape.x, shape.y, shape.width, shape.height);
        if (shape.fill) {
          context.fill();
        }
        context.stroke();
        break;
      case 'circle':
        context.beginPath();
        context.arc(shape.x, shape.y, shape.radius, 0, 2 * Math.PI);
        if (shape.fill) {
          context.fill();
        }
        context.stroke();
        break;
      case 'line':
        context.beginPath();
        context.moveTo(shape.x1, shape.y1);
        context.lineTo(shape.x2, shape.y2);
        context.stroke();
        break;
      default:
        break;
    }
    saveToHistory();
  };

  const floodFill = (x, y, fillColor) => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const targetColor = getPixelColor(imageData, x, y);
    
    if (colorsMatch(targetColor, hexToRgb(fillColor))) return;
    
    const pixelsToCheck = [{x, y}];
    
    while (pixelsToCheck.length > 0) {
      const pixel = pixelsToCheck.pop();
      const pixelIndex = (pixel.y * canvas.width + pixel.x) * 4;
      
      if (!colorsMatch(getPixelColorFromIndex(imageData, pixelIndex), targetColor)) continue;
      
      setPixelColor(imageData, pixelIndex, hexToRgb(fillColor));
      
      // Add neighboring pixels
      if (pixel.x > 0) pixelsToCheck.push({x: pixel.x - 1, y: pixel.y});
      if (pixel.x < canvas.width - 1) pixelsToCheck.push({x: pixel.x + 1, y: pixel.y});
      if (pixel.y > 0) pixelsToCheck.push({x: pixel.x, y: pixel.y - 1});
      if (pixel.y < canvas.height - 1) pixelsToCheck.push({x: pixel.x, y: pixel.y + 1});
    }
    
    context.putImageData(imageData, 0, 0);
    saveToHistory();
  };

  const getPixelColor = (imageData, x, y) => {
    const index = (y * imageData.width + x) * 4;
    return getPixelColorFromIndex(imageData, index);
  };

  const getPixelColorFromIndex = (imageData, index) => {
    return {
      r: imageData.data[index],
      g: imageData.data[index + 1],
      b: imageData.data[index + 2],
      a: imageData.data[index + 3]
    };
  };

  const setPixelColor = (imageData, index, color) => {
    imageData.data[index] = color.r;
    imageData.data[index + 1] = color.g;
    imageData.data[index + 2] = color.b;
    imageData.data[index + 3] = color.a || 255;
  };

  const colorsMatch = (color1, color2) => {
    return color1.r === color2.r && 
           color1.g === color2.g && 
           color1.b === color2.b && 
           color1.a === color2.a;
  };

  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
      a: 255
    } : { r: 0, g: 0, b: 0, a: 255 };
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    context.clearRect(0, 0, canvas.width, canvas.height);
    canvasHistory.current = [];
    historyIndex.current = -1;
  };

  const saveToHistory = () => {
    // Get the current canvas state as an image
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL();
    
    // If we're not at the end of history, remove future states
    if (historyIndex.current < canvasHistory.current.length - 1) {
      canvasHistory.current = canvasHistory.current.slice(0, historyIndex.current + 1);
    }
    
    canvasHistory.current.push(dataUrl);
    historyIndex.current = canvasHistory.current.length - 1;
  };

  const undo = () => {
    if (historyIndex.current <= 0) {
      clearCanvas();
      historyIndex.current = -1;
      return;
    }
    
    historyIndex.current--;
    const img = new Image();
    img.onload = () => {
      contextRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      contextRef.current.drawImage(img, 0, 0);
    };
    img.src = canvasHistory.current[historyIndex.current];
  };

  const redo = () => {
    if (historyIndex.current >= canvasHistory.current.length - 1) return;
    
    historyIndex.current++;
    const img = new Image();
    img.onload = () => {
      contextRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      contextRef.current.drawImage(img, 0, 0);
    };
    img.src = canvasHistory.current[historyIndex.current];
  };

  const startDrawing = (e) => {
    const { offsetX, offsetY } = e.nativeEvent;
    
    if (selectedTool === 'text') {
      setTextPosition({ x: offsetX, y: offsetY });
      return;
    }
    
    if (selectedTool === 'fill') {
      floodFill(offsetX, offsetY, color);
      socketRef.current.emit('fill', { roomId, x: offsetX, y: offsetY, color });
      return;
    }
    
    setIsDrawing(true);
    
    if (selectedTool === 'pen' || selectedTool === 'eraser') {
      contextRef.current.beginPath();
      contextRef.current.moveTo(offsetX, offsetY);
      contextRef.current.lastX = offsetX;
      contextRef.current.lastY = offsetY;
    } else if (selectedTool === 'rectangle' || selectedTool === 'circle' || selectedTool === 'line') {
      setCurrentShape({
        type: selectedTool,
        x1: offsetX,
        y1: offsetY,
        x2: offsetX,
        y2: offsetY,
        color: selectedTool === 'eraser' ? '#ffffff' : color,
        brushSize: selectedTool === 'eraser' ? eraserSize : brushSize,
        fill: isFilling,
        fillColor: fillColor
      });
    }
  };

  const draw = (e) => {
    if (!isDrawing || !currentShape) return;
    const { offsetX, offsetY } = e.nativeEvent;
    
    if (selectedTool === 'pen' || selectedTool === 'eraser') {
      const x1 = contextRef.current.lastX || offsetX;
      const y1 = contextRef.current.lastY || offsetY;
      
      contextRef.current.strokeStyle = selectedTool === 'eraser' ? '#ffffff' : color;
      contextRef.current.lineWidth = selectedTool === 'eraser' ? eraserSize : brushSize;
      contextRef.current.lineTo(offsetX, offsetY);
      contextRef.current.stroke();
      
      contextRef.current.lastX = offsetX;
      contextRef.current.lastY = offsetY;
      
      const drawingData = {
        roomId,
        type: 'draw',
        x1,
        y1,
        x2: offsetX,
        y2: offsetY,
        color: selectedTool === 'eraser' ? '#ffffff' : color,
        brushSize: selectedTool === 'eraser' ? eraserSize : brushSize
      };
      
      socketRef.current.emit('draw', drawingData);
    } else if (selectedTool === 'rectangle' || selectedTool === 'circle' || selectedTool === 'line') {
      // Update the current shape
      const updatedShape = {
        ...currentShape,
        x2: offsetX,
        y2: offsetY
      };
      
      setCurrentShape(updatedShape);
      
      // Redraw the canvas up to this point
      redrawCanvas(canvasHistory.current.slice(0, historyIndex.current + 1));
      
      // Draw the current shape
      const tempContext = canvasRef.current.getContext('2d');
      tempContext.strokeStyle = updatedShape.color;
      tempContext.lineWidth = updatedShape.brushSize;
      tempContext.fillStyle = updatedShape.fillColor || 'transparent';
      
      switch(updatedShape.type) {
        case 'rectangle':
          const rectWidth = updatedShape.x2 - updatedShape.x1;
          const rectHeight = updatedShape.y2 - updatedShape.y1;
          tempContext.beginPath();
          tempContext.rect(updatedShape.x1, updatedShape.y1, rectWidth, rectHeight);
          if (updatedShape.fill) {
            tempContext.fill();
          }
          tempContext.stroke();
          break;
        case 'circle':
          const radius = Math.sqrt(
            Math.pow(updatedShape.x2 - updatedShape.x1, 2) + 
            Math.pow(updatedShape.y2 - updatedShape.y1, 2)
          );
          tempContext.beginPath();
          tempContext.arc(updatedShape.x1, updatedShape.y1, radius, 0, 2 * Math.PI);
          if (updatedShape.fill) {
            tempContext.fill();
          }
          tempContext.stroke();
          break;
        case 'line':
          tempContext.beginPath();
          tempContext.moveTo(updatedShape.x1, updatedShape.y1);
          tempContext.lineTo(updatedShape.x2, updatedShape.y2);
          tempContext.stroke();
          break;
        default:
          break;
      }
    }
  };

  const endDrawing = () => {
    if (!isDrawing) return;
    
    setIsDrawing(false);
    
    if (currentShape) {
      // Finalize the shape
      const finalizedShape = {
        ...currentShape,
        width: currentShape.x2 - currentShape.x1,
        height: currentShape.y2 - currentShape.y1,
        radius: currentShape.type === 'circle' ? 
          Math.sqrt(
            Math.pow(currentShape.x2 - currentShape.x1, 2) + 
            Math.pow(currentShape.y2 - currentShape.y1, 2)
          ) : null
      };
      
      // Add to history and emit to server
      saveToHistory();
      socketRef.current.emit('add-shape', { roomId, ...finalizedShape });
      setCurrentShape(null);
    }
  };

  const handleClear = () => {
    clearCanvas();
    socketRef.current.emit('clear', roomId);
  };

  const handleTextSubmit = (e) => {
    e.preventDefault();
    if (textInput.trim() && textPosition) {
      addText({ 
        x: textPosition.x, 
        y: textPosition.y, 
        text: textInput, 
        color,
        fontSize: brushSize * 2
      });
      socketRef.current.emit('add-text', { 
        roomId, 
        x: textPosition.x, 
        y: textPosition.y, 
        text: textInput, 
        color,
        fontSize: brushSize * 2
      });
      setTextInput('');
      setTextPosition(null);
    }
  };

  const handleUndo = () => {
    undo();
    socketRef.current.emit('undo', roomId);
  };

  const handleRedo = () => {
    redo();
    socketRef.current.emit('redo', roomId);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-11/12 max-w-6xl max-h-[90vh] overflow-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Collaborative Whiteboard</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        
        <div className="toolbar mb-4 flex flex-wrap gap-4 items-center">
          <div className="flex gap-2">
            {tools.map(tool => (
              <button
                key={tool.id}
                onClick={() => setSelectedTool(tool.id)}
                className={`px-3 py-1 rounded ${selectedTool === tool.id ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
              >
                {tool.name}
              </button>
            ))}
          </div>
          
          <div>
            <label className="mr-2">Color:</label>
            <input 
              type="color" 
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-10 h-10 cursor-pointer"
            />
          </div>
          
          <div>
            <label className="mr-2">Brush Size:</label>
            <input 
              type="range" 
              min="1" 
              max="50" 
              value={brushSize}
              onChange={(e) => setBrushSize(e.target.value)}
              className="w-24"
            />
            <span className="ml-2">{brushSize}</span>
          </div>
          
          {selectedTool === 'eraser' && (
            <div>
              <label className="mr-2">Eraser Size:</label>
              <input 
                type="range" 
                min="1" 
                max="50" 
                value={eraserSize}
                onChange={(e) => setEraserSize(e.target.value)}
                className="w-24"
              />
              <span className="ml-2">{eraserSize}</span>
            </div>
          )}
          
          {(selectedTool === 'rectangle' || selectedTool === 'circle') && (
            <div className="flex items-center">
              <input 
                type="checkbox" 
                id="fillShape"
                checked={isFilling}
                onChange={(e) => setIsFilling(e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="fillShape">Fill</label>
              {isFilling && (
                <input 
                  type="color" 
                  value={fillColor}
                  onChange={(e) => setFillColor(e.target.value)}
                  className="w-8 h-8 cursor-pointer ml-2"
                />
              )}
            </div>
          )}
          
          <button 
            onClick={handleUndo}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            Undo
          </button>
          
          <button 
            onClick={handleRedo}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            Redo
          </button>
          
          <button 
            onClick={handleClear}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Clear Board
          </button>
        </div>
        
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={endDrawing}
          onMouseLeave={endDrawing}
          className="border border-gray-300 bg-white w-full"
          style={{ height: '60vh' }}
        />

        {selectedTool === 'text' && textPosition && (
          <form onSubmit={handleTextSubmit} className="mt-2 flex items-center">
            <input 
              type="text" 
              value={textInput} 
              onChange={(e) => setTextInput(e.target.value)} 
              className="border p-2 rounded mr-2" 
              placeholder="Enter text" 
              autoFocus
            />
            <button type="submit" className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
              Add Text
            </button>
            <button 
              type="button" 
              onClick={() => setTextPosition(null)} 
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 ml-2"
            >
              Cancel
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default WhiteboardModal;