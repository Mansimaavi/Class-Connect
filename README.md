# 📚 Class Connect

## 🧾 Project Overview
**Class Connect** is a collaborative platform built to revolutionize the way students learn, share, and engage academically. It enables students to create or join study groups, share valuable resources, and collaborate via real-time chat, polls, and video calls. With a mix of productivity and social learning features like progress tracking, public discussion forums, and a smart virtual whiteboard, Class Connect enhances both personal and group-based learning.

---

## 📄 Project Description

**Class Connect** is an interactive web-based application that fosters a connected and efficient learning environment for students. It supports everything from resource sharing to real-time collaboration, making it a powerful academic tool.

### After Logging In: 
Students are redirected to their **personal profile dashboard**, where they can:
- **Create or Join Study Groups**
  - *Create groups based on subjects or specific topics.*
  - *Invite friends to join using a unique group key.*

### Inside a Study Group:
Once part of a group, members can:
- **Share Study Resources**
  - *Upload notes, PDFs, books, and presentations.*
- **Chat & Collaborate**
  - *Engage in real-time group discussions.*
  - *React to messages.*
  - *Delete ,Edit single message*
  - *Delete selected Messages* 
  - *Conduct quick **polls** to gather opinions.*
- **Schedule Video Meetings**
  - *Plan group study sessions using the integrated meeting scheduler.*
- **Get Notifications**
  - *Receive instant updates when a new resource is added or a new member joins.*

### Productivity Tools:
- **Track Your Progress**
  - *Mark study materials as completed.*
  - *Get **daily reminders** based on your progress.*
- **Set Personal Reminders**
  - *Create to-do lists tailored to your academic needs.*

### Public Collaboration:
- **Public Resource Space**
  - *Share and explore handwritten notes globally.*
  - *Use **subject-wise filters** to find relevant content.*
  - *Rate and discuss public resources.*
- **General Discussion Room**
  - *Open-topic discussions for all users.*
  - *All users can actively participate.*

### Additional Features:
- **Dark Mode**
  - *For comfortable reading during late-night study sessions.*
- **Multilingual Support**
  - *Use the platform in your preferred language.*
- **Digital Whiteboard**
  - *Draw, write, erase, and annotate images in real time.*
  - *Basic features are free; **premium templates** are available for enhanced creativity.*
- **PDF Summarizer**
  - *Upload any PDF and summarize it by entering a custom word limit.*

---

## 🛠️ Tech Stack

### Frontend:
- React.js / Next.js
- Redux / Context API (for state management)
- Tailwind CSS / Bootstrap

### Backend:
- Node.js with Express.js
- MongoDB (NoSQL Database)
- JWT for Authentication
- Socket.IO (for real-time communication)

### Optional Integrations:
- Cloudinary (for file uploads)
- Gemini (for Summarization)

---

## 🧩 Project Structure
```bash
ClassConnect/
│
├── backend/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── utils/
│   └── server.js
│
├── frontend/
│   ├── components/
│   ├── pages/
│   ├── utils/
│   ├── hooks/
│   └── App.jsx
│
├── .env
├── package.json
└── README.md

```

---

## Flow Chart

<img src="https://github.com/user-attachments/assets/e27145a0-18ea-493d-b265-13c3c82d9963" alt="App Preview" style="width: 80%; height:30% ; border-radius: 10px;" />

## 🚀 Getting Started

### Prerequisites

- Node.js and npm
- MongoDB instance (local or Atlas)
- Git & VS Code

### Installation

```bash
git clone https://github.com/yourusername/ClassConnect.git
cd ClassConnect

# Setup server
cd backend
npm install
npm start

# Setup client
cd frontend
npm install
npm run dev


