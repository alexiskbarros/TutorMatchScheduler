# Tutor Match Scheduler  
*ENTI 633 – Generative AI & Prompting (Haskayne School of Business, University of Calgary)*

TutorMatch Scheduler is a full-stack web application that automates the complex scheduling and matching process used by university Peer Learning Programs. It uses a constraint-based matching engine, driven by real course, instructor, and schedule data from Google Sheets, to propose optimized study groups for learners and volunteer Learning Peers.

This project was developed as part of **ENTI 633 – Generative AI and Prompting** (MBA program at the **Haskayne School of Business, University of Calgary**), instructed by **Professor Andishe Ashjari**.

---

## 👥 Team Members
- Alexis Osorio de Barros  
- Carina Hickey  
- Jaydon Cornell  
- Natasha Grandy  
- Jordyn Caron  

---

## 📌 What the App Does
Each semester, the Peer Learning Program must match hundreds of learners with volunteer Learning Peers. Historically, this process has taken **2–3 weeks** due to:

- Instructor-specific matching  
- Course alignment  
- Complex and conflicting schedules  
- Travel buffers between classes  
- Limited Learning Peer capacity  

TutorMatch Scheduler replaces this slow manual workflow by:

- Importing learner and peer data from a Google Sheet  
- Applying strict matching constraints  
- Generating optimized study groups  
- Displaying results in an administrative dashboard  
- Listing unmatched learners with clear explanations  
- Allowing staff to approve or reject proposed groups  

Live demo: https://tutor-match-scheduler.replit.app/

---

## 🧠 Key Features

### 🔄 Constraint-Based Matching Engine
- Groups of **1–4 learners** in the same course  
- Honors **Instructor Match Required**  
- Availability window checking (08:00–20:00)  
- **5-minute travel buffer** between classes and sessions  
- Learning Peer capacity limits  
- Maximizes total learners matched  

### 📅 Google Sheets Integration
- Loads learners and Learning Peers from a shared Sheet  
- Parses schedules into time blocks  
- Normalizes instructor name formats  
- Supports multi-course tutor expertise  

### 🧑‍💻 Administrator Dashboard
- One-click matching  
- Review, approve, or reject proposed groups  
- Re-queue rejected learners  
- View unmatched learners + specific reasons  

### ✉️ Group Notification Emails (MVP)
- Sends a single unified email to all group members  

---

## 🛠️ Tech Stack & Dependencies

### Frontend (`client/`)
- React  
- TypeScript  
- Vite  
- Tailwind CSS  
- shadcn/ui  
- Radix Primitives  
- TanStack Query  
- Wouter Router  

### Backend (`server/`)
- Node.js  
- Express  
- Matching Engine Logic  
- Google Sheets API  

### Other
- Shared utilities in `/shared`  
- Light ORM config in `/db`  
- Replit (development + deployment)  
- Git + GitHub  
- ChatGPT + Gemini during development  

---

## 🚀 Getting Started

### 1. Clone the Repository
    git clone https://github.com/alexiskbarros/TutorMatchScheduler.git
    cd TutorMatchScheduler

### 2. Install Dependencies
    npm install

### 3. Run the App
    npm run dev

Open the printed local URL to launch the app.

---

## 📁 Repository Structure

    client/                      # React frontend
      src/                       # Components, pages, logic
      public/                    # Static files
      index.html                 # Frontend entry point

    server/                      # Node.js backend
      matching/                  # Group matching engine
      sheets/                    # Google Sheets ingestion & cleaning
      routes/                    # API endpoints
      index.js                   # Server entry point

    shared/                      # Shared utilities
    db/                          # ORM (light use)
    attached_assets/             # Replit assets
    .local/state/replit/agent/   # Replit internal files

    package.json                 # Dependencies and scripts
    LICENSE                      # MIT License
    README.md                    # This document

---

## 🧪 Manual Testing

### ✔ Basic Matching
- Load sample learners & peers  
- Run the matching engine  
- Confirm groups appear correctly  

### ✔ Instructor Matching
- Mark a learner as “Instructor Match Required”  
- Verify matches only assign correct instructors  

### ✔ Scheduling Conflicts
- Create a learner with no overlapping times  
- Ensure they appear in **Unmatched** with a clear reason  

### ✔ Learning Peer Capacity
- Add large numbers of learners tied to one Peer  
- Ensure Peer does not exceed allowed max groups  

---

## 📝 Blog Post & Demo Video  
(Links added after publishing)

- **LinkedIn Blog Post**  
- **3–5 Minute Demo Video (Narrated Screen Recording)**  

---

## 🤝 Contributors

- **Jaydon Cornell** – Lead Developer
- **Natasha Grandy** – Data Analyst
- **Carina Hickey** – Product Owner 
- **Alexis Osorio de Barros** – Repository Manager 
- **Jordyn Caron** – Communications & Media Lead

Haskayne School of Business  
University of Calgary  

---

## 📄 License

This project is released under the **MIT License**.
