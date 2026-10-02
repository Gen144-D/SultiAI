<div align="center">

<a href="https://github.com/Git-coder-err/SultiAI">
<img src="https://capsule-render.vercel.app/api?type=waving&color=0:5B5FEF,50:2563EB,100:0D9488&height=230&section=header&text=SultiAI&fontSize=72&fontColor=ffffff&fontAlignY=38&desc=AI%20Language%20Companion%20for%20Context-Aware%20Communication&descAlignY=60&descSize=18&animation=fadeIn" width="100%"/>
</a>

<br>

<img src="https://readme-typing-svg.demolab.com?font=Inter&weight=600&size=22&duration=3000&pause=1000&color=5B5FEF&center=true&vCenter=true&width=800&lines=Learn+Bisaya.+Speak+Confidently.;AI-Powered+Context-Aware+Communication;Speech+%E2%86%92+Context+%E2%86%92+Recommendation;Built+for+Real-World+Conversations;Language+Technology+for+Cultural+Preservation" alt="SultiAI typing animation"/>

<br><br>

<p align="center">
  <strong>SultiAI</strong> is an AI-powered language companion designed to help non-native speakers communicate naturally and confidently in real-world situations.
</p>

<br>

<p align="center">
  <a href="#-vision">Vision</a> •
  <a href="#-features">Features</a> •
  <a href="#-technology-stack">Tech Stack</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-setup-guide">Setup</a> •
  <a href="#-development-status">Status</a>
</p>

<br>

<p align="center">

[![Status](https://img.shields.io/badge/Status-In%20Development-5B5FEF?style=for-the-badge)](#-development-status)
[![Capstone](https://img.shields.io/badge/Project-Capstone%20Project-2563EB?style=for-the-badge)](#-sultiai)
[![Platform](https://img.shields.io/badge/Platform-Web%20%7C%20Mobile-0D9488?style=for-the-badge)](#-technology-stack)
[![License](https://img.shields.io/badge/License-MIT-success?style=for-the-badge)](./LICENSE)

</p>

<p align="center">

![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square\&logo=react\&logoColor=white)
![React Native](https://img.shields.io/badge/React%20Native-0.72%2B-61DAFB?style=flat-square\&logo=react\&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5%2B-3178C6?style=flat-square\&logo=typescript\&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=flat-square\&logo=node.js\&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?style=flat-square\&logo=python\&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15%2B-4169E1?style=flat-square\&logo=postgresql\&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square\&logo=docker\&logoColor=white)

</p>

</div>

---

# 🗣️ SultiAI

## AI Language Companion for Context-Aware Communication

SultiAI is a **Capstone Project** developed by BSIT students of **Jose Maria College Foundation, Inc.**

Unlike traditional translation applications that simply convert words from one language to another, SultiAI is designed as an **AI Language Companion** that understands conversational context and helps users select appropriate responses.

The system is designed to support non-native speakers in real-world situations such as:

* 🏫 Schools
* 💼 Workplaces
* 🚌 Public transportation
* 🍽️ Restaurants
* 🏥 Hospitals
* 🏛️ Government offices
* 🛍️ Everyday social interactions

The goal is to help users move from:

```text
Translation Dependency
        ↓
Contextual Understanding
        ↓
Guided Communication
        ↓
Language Learning
        ↓
Conversational Confidence
```

---

# 📌 Table of Contents

* [SultiAI](#-sultiai)
* [Vision](#-vision)
* [Core Principle](#-core-principle)
* [Features](#-features)
* [Technology Stack](#-technology-stack)
* [Architecture](#-architecture)
* [AI Conversation Pipeline](#-ai-conversation-pipeline)
* [Monorepo Structure](#-monorepo-structure)
* [Security Architecture](#-security-architecture)
* [API Design](#-api-design)
* [Database Design](#-database-design)
* [Local AI Mode](#-local-ai-mode)
* [External AI Services](#-external-ai-services)
* [Cloud + Local Architecture](#-cloud--local-hybrid-architecture)
* [Original vs Revised Stack](#-original-vs-revised-technology-stack)
* [Key Benefits](#-key-benefits)
* [Manuscript Revision Checklist](#-manuscript-revision-checklist)
* [Setup Guide](#-setup-guide)
* [Testing](#-testing)
* [Troubleshooting](#-troubleshooting)
* [Development Status](#-development-status)
* [Contributors](#-contributors)
* [Adviser](#-adviser)
* [License](#-license)
* [Contact](#-contact)

---

# 🎯 Vision

> **To bridge language barriers by providing context-aware AI communication assistance that empowers users to communicate naturally and confidently in real-world situations.**

SultiAI is designed not merely as a translator, but as an intelligent learning companion that supports users while they develop their own communication skills.

---

# 🧭 Core Principle

SultiAI does **not** aim to replace human conversation.

Instead, it empowers users by providing contextual guidance while helping them gradually become more independent and confident speakers.

```text
                  USER
                   │
                   ▼
             ┌───────────┐
             │   SPEAK   │
             └─────┬─────┘
                   │
                   ▼
             ┌───────────┐
             │  ANALYZE  │
             └─────┬─────┘
                   │
                   ▼
             ┌───────────┐
             │ UNDERSTAND│
             └─────┬─────┘
                   │
                   ▼
             ┌───────────┐
             │ RECOMMEND │
             └─────┬─────┘
                   │
                   ▼
             ┌───────────┐
             │  RESPOND  │
             └─────┬─────┘
                   │
                   ▼
             ┌───────────┐
             │   LEARN   │
             └───────────┘
```

---

# ✨ Features

<table>
<tr>
<td width="50%">

### 🎙️ Real-Time Speech Recognition

Convert spoken conversations into text using speech recognition technology.

</td>
<td width="50%">

### 🧠 Context Understanding

Analyze conversational intent and context rather than relying only on direct word translation.

</td>
</tr>

<tr>
<td>

### 💡 AI Response Suggestions

Provide natural response recommendations appropriate for the current situation.

</td>
<td>

### 🌐 Translation Support

Assist users in understanding unfamiliar words, phrases, and expressions.

</td>
</tr>

<tr>
<td>

### 👤 AI Avatar Companion

An interactive AI companion designed to make language learning more engaging.

</td>
<td>

### 📚 Personalized Learning

Adapt language assistance based on user progress and learning preferences.

</td>
</tr>

<tr>
<td>

### 🌏 Community Learning

Support collaborative language learning and cultural exchange.

</td>
<td>

### 🎮 Gamified Learning

Use XP, challenges, achievements, and progress tracking to encourage continued practice.

</td>
</tr>
</table>

---

# 🛠️ Technology Stack

> **Last Updated: August 2026**

## System Architecture Overview

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌────────────────┐   ┌────────────────┐   ┌────────────────┐         │
│   │    Web App     │   │   Mobile App   │   │  Admin Panel   │         │
│   │     React      │   │ React Native   │   │     React      │         │
│   └────────────────┘   └────────────────┘   └────────────────┘         │
│                                                                         │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            API GATEWAY                                  │
│                                                                         │
│                    Node.js + Express + TypeScript                       │
│                                                                         │
│       Authentication • Validation • Routing • Rate Limiting             │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           SERVICES LAYER                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐             │
│  │ Whisper        │  │ BERT           │  │ Translation    │             │
│  │ Service        │  │ Service        │  │ Service        │             │
│  │ Python         │  │ Python         │  │ Python         │             │
│  └────────────────┘  └────────────────┘  └────────────────┘             │
│                                                                         │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                             DATA LAYER                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌────────────────┐   ┌────────────────┐   ┌────────────────┐          │
│   │  PostgreSQL    │   │     Redis      │   │   MinIO / S3   │          │
│   │    Primary     │   │ Cache / Queue  │   │     Storage    │          │
│   └────────────────┘   └────────────────┘   └────────────────┘          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

# 🖥️ Frontend

| Component        | Technology                         | Version | Purpose                         |
| ---------------- | ---------------------------------- | ------: | ------------------------------- |
| Web Framework    | React                              |   18.2+ | Main browser interface          |
| Mobile Framework | React Native                       |   0.72+ | iOS and Android application     |
| Shared Core      | TypeScript                         |    5.0+ | Shared business logic and types |
| State Management | Zustand                            |    4.4+ | Lightweight application state   |
| Data Fetching    | TanStack Query                     |    4.0+ | Server-state caching            |
| Web Routing      | React Router DOM                   |   6.18+ | Web navigation                  |
| Mobile Routing   | React Navigation                   |    6.0+ | Native navigation               |
| Web Styling      | Tailwind CSS                       |    3.3+ | Utility-first CSS               |
| Mobile Styling   | NativeWind                         |    4.0+ | Tailwind for React Native       |
| Web UI           | shadcn/ui                          |  Latest | Accessible components           |
| Mobile UI        | React Native Paper                 |    5.0+ | Material-style components       |
| Web Audio        | Web Audio API                      |  Native | Browser audio capture           |
| Mobile Audio     | react-native-audio-recorder-player |    3.5+ | Mobile recording                |
| Build Tool       | Vite                               |    4.5+ | Web development and builds      |
| Mobile Bundler   | Metro                              |   0.76+ | React Native bundling           |
| Package Manager  | pnpm                               |    8.0+ | Monorepo management             |

---

# 🖥️ Admin Dashboard

| Component      | Technology      | Version | Purpose               |
| -------------- | --------------- | ------: | --------------------- |
| Framework      | React           |   18.2+ | Admin dashboard       |
| Admin Builder  | KratosJS        |  Latest | CRUD/admin generation |
| UI Components  | shadcn/ui       |  Latest | Consistent interface  |
| Data Grid      | AG Grid         |   29.0+ | Advanced tables       |
| Forms          | React Hook Form |   7.47+ | Form handling         |
| Charts         | Recharts        |    2.8+ | Analytics             |
| Authentication | JWT + RBAC      |       — | Secure admin access   |
| API Client     | TanStack Query  |    4.0+ | API data management   |

---

# ⚙️ Backend API

| Component         | Technology         | Version | Purpose                       |
| ----------------- | ------------------ | ------: | ----------------------------- |
| Runtime           | Node.js            | 18+ LTS | Server runtime                |
| Framework         | Express.js         |   4.18+ | REST API                      |
| Language          | TypeScript         |    5.0+ | Type-safe development         |
| API Documentation | Swagger/OpenAPI    |     3.0 | API documentation             |
| Authentication    | JWT                |    9.0+ | Authentication                |
| Authorization     | Custom RBAC        |       — | Role-based access             |
| Validation        | Zod                |   3.22+ | Request validation            |
| Rate Limiting     | express-rate-limit |    6.0+ | Abuse prevention              |
| Security          | Helmet             |    7.0+ | Security headers              |
| Logging           | Winston            |   3.11+ | Structured logging            |
| Metrics           | Prometheus         |  Latest | Application metrics           |
| Monitoring        | Grafana            |  Latest | Monitoring dashboards         |
| Queue             | BullMQ             |    4.0+ | Background jobs               |
| Process Manager   | PM2                |    5.3+ | Production process management |

---

# 🧠 AI & Audio Analysis

All of this runs in-process in the Node server.

| Component             | Technology        | Version | Purpose                                       |
| --------------------- | ----------------- | ------: | --------------------------------------------- |
| Speech Recognition    | Groq (Whisper)    |  Latest | Speech-to-text                                |
| LLM Chat              | Groq              |  Latest | Tutor and intent handling                     |
| Text-to-Speech        | msedge-tts        |  Latest | Speech synthesis                              |
| Audio Decoding        | ffmpeg-static     |   5.3+  | Decodes m4a/AAC/webm recordings to PCM        |
| Acoustic Analysis     | TypeScript (own)  |    —    | MFCC, pitch (NSDF), formants (LPC)            |
| Grapheme-to-Phoneme   | TypeScript (own)  |    —    | Bisaya/Tagalog/English phoneme conversion     |

There is no Python service, no model download, and no second container to run.

---

# 🗄️ Database & Storage

| Component         | Technology     | Version | Purpose                   |
| ----------------- | -------------- | ------: | ------------------------- |
| Primary Database  | PostgreSQL     |     15+ | Relational data           |
| ORM               | Prisma         |      5+ | Type-safe database access |
| Migration         | Prisma Migrate |      5+ | Database migrations       |
| Cache             | Redis          |      7+ | Fast caching              |
| Queue Backend     | Redis          |      7+ | BullMQ backend            |
| File Storage      | MinIO          |  Latest | S3-compatible storage     |
| Cloud Alternative | AWS S3         |       — | Cloud object storage      |
| Backup            | pg_dump + Cron |       — | Database backup           |

---

# 🚀 Development & Deployment

| Component          | Technology                  | Purpose                    |
| ------------------ | --------------------------- | -------------------------- |
| Version Control    | Git                         | Source control             |
| Repository         | GitHub                      | Collaboration              |
| Monorepo           | pnpm Workspaces             | Multi-package management   |
| CI/CD              | GitHub Actions              | Automated deployment       |
| Containerization   | Docker                      | Service isolation          |
| Orchestration      | Docker Compose              | Multi-container deployment |
| Cloud              | AWS / DigitalOcean / Render | Hosting                    |
| SSL                | Let's Encrypt + Certbot     | HTTPS                      |
| Error Tracking     | Sentry                      | Error monitoring           |
| Log Management     | ELK Stack                   | Centralized logging        |
| Process Management | PM2                         | Node.js production         |

---

# 🏗️ Architecture

```text
                         ┌──────────────────┐
                         │      USERS       │
                         └────────┬─────────┘
                                  │
                  ┌───────────────┼───────────────┐
                  │               │               │
                  ▼               ▼               ▼
             ┌─────────┐    ┌───────────┐   ┌─────────┐
             │   WEB   │    │  MOBILE   │   │ ADMIN   │
             │  React  │    │   React   │   │  React  │
             └────┬────┘    │  Native   │   └────┬────┘
                  │         └─────┬─────┘        │
                  └───────────────┼───────────────┘
                                  ▼
                    ┌────────────────────────┐
                    │      API GATEWAY       │
                    │ Node.js + Express + TS │
                    └────────────┬───────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
              ▼                  ▼                  ▼
        ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
        │     AI      │   │ APPLICATION │   │ BACKGROUND  │
        │  (in-proc)  │   │   SERVICE   │   │    JOBS     │
        │             │   │             │   │   BullMQ    │
        │ Groq Whisper│   │ Users       │   │   Redis     │
        │ Groq LLM    │   │ Conversations│  │             │
        │ ffmpeg + DSP│   │ Learning    │   │             │
        └──────┬──────┘   └──────┬──────┘   └──────┬──────┘
              │                 │                 │
              └─────────────────┼─────────────────┘
                                ▼
                    ┌────────────────────────┐
                    │       DATA LAYER       │
                    ├────────────────────────┤
                    │ PostgreSQL             │
                    │ Redis                  │
                    │ MinIO / S3             │
                    └────────────────────────┘
```

---

# 🔄 AI Conversation Pipeline

```text
🎙️ USER SPEECH
      │
      ▼
┌──────────────────────┐
│       WHISPER        │
│    Speech → Text     │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│        BERT          │
│  Intent + Context    │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│    CONTEXT ENGINE    │
│ Situation + Meaning  │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ AI RECOMMENDATION    │
│ Response Suggestions │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ TRANSLATION /        │
│ EXPLANATION          │
└──────────┬───────────┘
           │
           ▼
💬 USER RESPONSE
           │
           ▼
📚 LEARNING DATA
```

---

# 📁 Monorepo Structure

```text
sultiai/
│
├── packages/
│   │
│   ├── shared/
│   │   ├── src/
│   │   │   ├── types/
│   │   │   ├── validators/
│   │   │   ├── constants/
│   │   │   └── utils/
│   │   └── package.json
│   │
│   ├── web/
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   ├── hooks/
│   │   │   ├── contexts/
│   │   │   └── App.tsx
│   │   ├── index.html
│   │   ├── tailwind.config.js
│   │   ├── vite.config.ts
│   │   └── package.json
│   │
│   ├── mobile/
│   │   ├── src/
│   │   │   ├── screens/
│   │   │   ├── components/
│   │   │   ├── navigation/
│   │   │   └── App.tsx
│   │   ├── ios/
│   │   ├── android/
│   │   ├── metro.config.js
│   │   └── package.json
│   │
│   └── admin/
│       ├── src/
│       │   ├── components/
│       │   ├── pages/
│       │   ├── layouts/
│       │   └── App.tsx
│       ├── tailwind.config.js
│       ├── vite.config.ts
│       └── package.json
│
├── server/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── routes/
│   │   ├── middlewares/
│   │   ├── models/
│   │   ├── types/
│   │   ├── utils/
│   │   └── index.ts
│   ├── prisma/
│   │   └── schema.prisma
│   ├── .env.example
│   ├── Dockerfile
│   └── package.json
│
├── docker-compose.yml
├── package.json
├── pnpm-workspace.yaml
├── .env.example
├── .gitignore
├── LICENSE
└── README.md
```

---

# 🔐 Security Architecture

```text
                  ┌─────────────────────┐
                  │       CLIENT        │
                  └──────────┬──────────┘
                             │
                             ▼
                  ┌─────────────────────┐
                  │    HTTPS / CORS     │
                  └──────────┬──────────┘
                             │
                             ▼
                  ┌─────────────────────┐
                  │      Helmet         │
                  └──────────┬──────────┘
                             │
                             ▼
                  ┌─────────────────────┐
                  │   Rate Limiting     │
                  └──────────┬──────────┘
                             │
                             ▼
                  ┌─────────────────────┐
                  │      JWT Auth       │
                  └──────────┬──────────┘
                             │
                             ▼
                  ┌─────────────────────┐
                  │       RBAC          │
                  └──────────┬──────────┘
                             │
                             ▼
                  ┌─────────────────────┐
                  │   Zod Validation    │
                  └──────────┬──────────┘
                             │
                             ▼
                  ┌─────────────────────┐
                  │ Application Service │
                  └─────────────────────┘
```

---

# 🔌 API Design

Example API structure:

```text
/api/v1
│
├── /auth
│   ├── POST /register
│   ├── POST /login
│   └── POST /refresh
│
├── /users
│   ├── GET /me
│   ├── PATCH /me
│   └── DELETE /me
│
├── /speech
│   └── POST /transcribe
│
├── /conversations
│   ├── GET /
│   ├── POST /
│   ├── GET /:id
│   └── POST /:id/messages
│
├── /recommendations
│   ├── GET /
│   └── POST /
│
├── /learning
│   ├── GET /progress
│   ├── GET /modules
│   └── POST /complete
│
└── /admin
    ├── /users
    ├── /analytics
    └── /content
```

Example endpoints:

```http
POST /api/v1/auth/login
POST /api/v1/auth/register

GET /api/v1/users/me

POST /api/v1/speech/transcribe

GET /api/v1/conversations
POST /api/v1/conversations
GET /api/v1/conversations/:id
POST /api/v1/conversations/:id/messages

GET /api/v1/learning/progress
GET /api/v1/recommendations
```

---

# 🗃️ Database Design

Core PostgreSQL entities:

```text
┌──────────────────────┐
│        Users         │
├──────────────────────┤
│ id                   │
│ email                │
│ password_hash        │
│ role                 │
│ created_at           │
└──────────┬───────────┘
           │
           ├─────────────────────┐
           │                     │
           ▼                     ▼
┌──────────────────────┐ ┌────────────────────────┐
│   UserPreferences    │ │ ConversationSessions   │
├──────────────────────┤ ├────────────────────────┤
│ id                   │ │ id                     │
│ user_id              │ │ user_id                │
│ language             │ │ context                │
│ level                │ │ started_at             │
└──────────────────────┘ └───────────┬────────────┘
                                     │
                                     ▼
                            ┌─────────────────┐
                            │    Messages     │
                            ├─────────────────┤
                            │ id              │
                            │ session_id      │
                            │ sender          │
                            │ content         │
                            │ created_at      │
                            └────────┬────────┘
                                     │
                                     ▼
                         ┌────────────────────────┐
                         │ PhraseRecommendations │
                         ├────────────────────────┤
                         │ id                     │
                         │ message_id             │
                         │ phrase                 │
                         │ explanation            │
                         │ confidence              │
                         └────────────────────────┘
```

---

# 📴 Local AI Mode

SultiAI is designed to support a local AI configuration where selected AI capabilities can operate without external API services.

### Benefits

* No external API dependency for supported features
* Reduced recurring API costs
* Better privacy for locally processed data
* Offline-capable workflows
* Local inference

### Example Local Models

| Model          | Approximate Size | Purpose                  |
| -------------- | ---------------: | ------------------------ |
| TinyLlama 1.1B |          ~600 MB | Local language responses |
| Whisper Tiny   |          ~300 MB | Speech-to-text           |
| Windows TTS    |         Built-in | Local voice synthesis    |

> Local mode and cloud/API-assisted mode are separate configurations. Features requiring external services require their corresponding credentials.

---

# 🎙️ Character Voices

| Character    | Voice Style        | Personality                       |
| ------------ | ------------------ | --------------------------------- |
| **Blessica** | Warm female        | Friendly and approachable         |
| **Angel**    | Clear male         | Patient and supportive            |
| **Sultan**   | Authoritative male | Confident and culturally grounded |
| **Lola**     | Gentle female      | Wise and encouraging              |

---

# 🔌 External AI Services

## Groq

Used for fast language-model inference where enabled by the backend.

```env
GROQ_API_KEY=your_groq_api_key
```

## xAI Voice Mode

Voice Mode can connect to a realtime xAI voice session.

```env
XAI_API_KEY=your_xai_api_key
XAI_VOICE_MODEL=grok-voice-latest
XAI_VOICE=eve
```

External AI services are optional depending on the deployment configuration.

---

# 🔄 Cloud + Local Hybrid Architecture

```text
                         SULTIAI CLIENT
                               │
                               ▼
                         NODE.JS API
                               │
                ┌──────────────┴──────────────┐
                │                             │
                ▼                             ▼
         ┌───────────────┐             ┌───────────────┐
         │   LOCAL AI    │             │   CLOUD AI    │
         └───────┬───────┘             └───────┬───────┘
                 │                             │
          ┌──────┴──────┐              ┌───────┴──────┐
          │             │              │              │
          ▼             ▼              ▼              ▼
       Whisper       Local LLM       Groq            xAI
          │             │              │              │
          └─────────────┴──────────────┴──────────────┘
                                │
                                ▼
                         APPLICATION DATA
                                │
                   ┌────────────┼────────────┐
                   ▼            ▼            ▼
              PostgreSQL      Redis       MinIO/S3
```

---

# 📊 Original vs Revised Technology Stack

| Category           | Original           | Revised                        |
| ------------------ | ------------------ | ------------------------------ |
| Web Frontend       | React 18           | React 18 + Vite                |
| Mobile             | Not specified      | React Native                   |
| State Management   | Redux Toolkit      | Zustand                        |
| Data Fetching      | Axios              | TanStack Query                 |
| Admin Dashboard    | Firebase Console   | Custom React Admin             |
| Backend            | Node.js + Express  | Node.js + Express + TypeScript |
| Database           | Firebase Firestore | PostgreSQL + Prisma            |
| Cache              | Firebase           | Redis                          |
| Queue              | —                  | BullMQ                         |
| File Storage       | Firebase Storage   | MinIO / AWS S3                 |
| Authentication     | Firebase Auth      | JWT + RBAC                     |
| Validation         | Manual             | Zod                            |
| AI Services        | Python scripts     | Groq + in-process TS DSP       |
| Speech Recognition | Whisper            | Whisper                        |
| NLP                | Python NLP         | BERT / Hugging Face            |
| Deployment         | Render / Manual    | Docker + Docker Compose        |
| CI/CD              | —                  | GitHub Actions                 |
| Logging            | Basic              | Winston + ELK                  |
| Monitoring         | —                  | Prometheus + Grafana           |
| Package Manager    | npm                | pnpm Workspaces                |

---

# 🌟 Key Benefits

### 1. Full Ownership

The architecture reduces dependency on a single vendor and gives the team greater control over infrastructure.

### 2. Type Safety

TypeScript, Prisma, and Zod provide stronger type and validation guarantees.

### 3. Shared Code

The monorepo architecture allows shared types, validators, constants, and utilities.

### 4. Scalability

PostgreSQL, Redis, BullMQ, and separated services provide a foundation for future scaling.

### 5. Observability

Winston, Prometheus, Grafana, Sentry, and ELK can provide application visibility.

### 6. Cost Control

Local models and self-hosted infrastructure can reduce recurring API and storage costs.

### 7. Academic Alignment

The architecture clearly separates presentation, application logic, AI processing, persistence, and infrastructure.

---

# 📑 Manuscript Revision Checklist

## Chapter 2 — Review of Related Literature and Studies

Update the literature review to support the technologies selected for the revised architecture.

Recommended areas:

* Monorepo architecture
* pnpm Workspaces
* Shared TypeScript code
* Zustand
* TanStack Query
* PostgreSQL
* Prisma ORM
* Redis
* Whisper speech recognition (via Groq)
* ffmpeg-static for audio decoding
* In-process TypeScript DSP (MFCC, pitch, formants)
* Docker
* AI-assisted language learning

The literature should explain **why each technology is appropriate for SultiAI** rather than simply listing the technology.

---

# 📖 Chapter 3 — Technical Background / System Architecture

Replace the old Firebase-centered architecture with the revised multi-tier architecture.

Recommended flow:

```text
Web / Mobile / Admin
        ↓
Node.js + Express API
        ↓
Groq (Whisper + LLM) + ffmpeg + in-process DSP
        ↓
Context + Recommendation
        ↓
PostgreSQL + Redis + MinIO
```

---

# 🧰 Chapter 3 — Development Tools

Recommended summary table:

| Category           | Technologies                            |
| ------------------ | --------------------------------------- |
| Frontend           | React, React Native, TypeScript         |
| State              | Zustand                                 |
| Data Fetching      | TanStack Query                          |
| Backend            | Node.js, Express, TypeScript            |
| AI/ML              | Groq (Whisper, LLM), ffmpeg, TS DSP     |
| Database           | PostgreSQL, Prisma                      |
| Cache              | Redis                                   |
| Storage            | MinIO                                   |
| DevOps             | Docker, Docker Compose                  |
| CI/CD              | GitHub Actions                          |
| Package Management | pnpm                                    |

---

# 🏛️ Chapter 4 — System Design

## Database Design

Replace Firebase/Firestore structures with a relational PostgreSQL schema.

Recommended core entities:

* `Users`
* `UserPreferences`
* `ConversationSessions`
* `Messages`
* `PhraseRecommendations`
* `LearningProgress`
* `LearningModules`
* `Achievements`
* `Notifications`

## API Design

Document endpoints such as:

```http
POST /api/v1/auth/login
POST /api/v1/auth/register

GET /api/v1/users/me

POST /api/v1/speech/transcribe

GET /api/v1/conversations
POST /api/v1/conversations
GET /api/v1/conversations/:id
POST /api/v1/conversations/:id/messages

GET /api/v1/learning/progress
GET /api/v1/recommendations
```

---

# 🧪 Chapter 5 — Implementation, Testing & Deployment

Update the deployment strategy to include:

* Docker
* Docker Compose
* GitHub Actions
* PostgreSQL
* Redis
* MinIO
* Node.js
* React
* React Native

### Testing Tools

```text
Frontend
├── Jest
├── React Testing Library
└── ESLint

Backend
├── Jest
├── Supertest
└── Postman

Audio / Pronunciation
├── test:dsp     (tsx: FFT, MFCC, pitch, formants, G2P, decode)
└── test:routes  (tsx: Supertest against the pronunciation endpoints)

System
└── Integration Testing
```

---

# 📈 Chapter 8 — Recommendations

Potential future recommendations:

1. Add a caching layer for pronunciation scoring results.
2. Expand custom RBAC with additional administrative roles.
3. Improve local model performance through quantization and optimization.
4. Expand regional language and dialect datasets.
5. Improve speech recognition for local accents and pronunciation.
6. Add more AI-assisted pronunciation feedback.
7. Expand cultural learning modules.
8. Explore privacy-preserving on-device AI inference.

---

# 🚀 Setup Guide

## Requirements

Install the following:

* Node.js 18+
* pnpm 8+
* Python 3.10+
* Git
* Docker
* Docker Compose
* PostgreSQL
* Redis

For mobile development:

* Android Studio and/or
* Xcode on macOS
* Expo tooling where applicable

---

## 1. Clone the Repository

```bash
git clone https://github.com/Git-coder-err/SultiAI.git
cd SultiAI
```

---

## 2. Install Dependencies

```bash
pnpm install
```

---

## 3. Configure Environment Variables

Create the root environment file:

```bash
cp .env.example .env
```

Create the server environment:

```bash
cp server/.env.example server/.env
```

Example:

```env
PORT=3001

JWT_SECRET=your_secure_secret

DATABASE_URL=postgresql://postgres:password@localhost:5432/sultiai

REDIS_URL=redis://localhost:6379

GROQ_API_KEY=your_groq_api_key

XAI_API_KEY=your_xai_api_key
XAI_VOICE_MODEL=grok-voice-latest
XAI_VOICE=eve
```

Only configure external AI keys for features that require them.

---

# ⚙️ Backend

The supported backend is the TypeScript Express server:

```text
server/
└── src/
    └── index.ts
```

Start from the repository root:

```bash
pnpm run server:dev
```

Or:

```bash
cd server
pnpm install
pnpm run dev
```

Health check:

```text
http://localhost:3001/api/health
```

> Do not use a legacy `server/index.js` stub. The supported backend entry point is the TypeScript server.

---

# 🗄️ Database Setup

Configure PostgreSQL:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/sultiai
```

Run Prisma:

```bash
cd server

pnpm prisma generate
pnpm prisma migrate dev
```

Open Prisma Studio:

```bash
pnpm prisma studio
```

---

# 🧠 Pronunciation Analysis

Pronunciation scoring runs **inside the Node server** — there is no separate AI
service to install or run. The acoustic analysis (MFCC, pitch, formants) is
implemented in TypeScript under `server/src/utils/dsp/`, and audio is decoded
with the `ffmpeg-static` binary that ships as an npm dependency.

Nothing to set up: start the server as usual.

```bash
cd server
npm install
npm run dev
```

Two endpoints are exposed, replacing the retired Python service:

| Endpoint | Purpose |
| --- | --- |
| `POST /api/speech/pronunciation/score` | Score a recording. Accepts a multipart `audio` file or an `audio_base64` field, plus `expected_text` and `language`. |
| `POST /api/speech/pronunciation/phonemes` | Convert text to its phoneme sequence. Takes `{ text, language }`. |

To check the analysis:

```bash
npm run test:dsp     # DSP + decoding + G2P regression suite
npm run test:routes  # exercises both endpoints over HTTP
```

> Note: the server Docker image is intentionally Debian-based, not Alpine.
> `ffmpeg-static` ships a glibc-linked binary, which would fail at runtime on
> musl.

---

# 🐳 Docker Setup

Build services:

```bash
docker compose build
```

Start:

```bash
docker compose up
```

Start in detached mode:

```bash
docker compose up -d
```

View logs:

```bash
docker compose logs -f
```

Stop:

```bash
docker compose down
```

---

# 📱 Mobile Development

For Expo:

```bash
pnpm expo start
```

Android:

```bash
pnpm expo run:android
```

iOS:

```bash
pnpm expo run:ios
```

---

# 📡 Physical Device Configuration

Set:

```env
EXPO_PUBLIC_API_URL=http://YOUR_BACKEND_IP:3001
```

Example:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.100:3001
```

Ensure:

* Backend is running.
* Device and computer are on the same network.
* Port `3001` is accessible.
* Firewall permits traffic.
* PostgreSQL is running.
* Redis is running.

---

# 🖥️ Emulator / Simulator

### Android Emulator

Use:

```text
http://10.0.2.2:3001
```

### iOS Simulator

Usually:

```text
http://localhost:3001
```

---

# 🧪 Testing

Run tests:

```bash
pnpm test
```

Run lint:

```bash
pnpm lint
```

Run type checking:

```bash
pnpm typecheck
```

For API testing, use Postman or another REST client.

Health endpoint:

```http
GET http://localhost:3001/api/health
```

---

# 🔧 Troubleshooting

## Backend Connection Failed

Check:

```bash
curl http://localhost:3001/api/health
```

---

## Find Local IP Address

Windows:

```bash
ipconfig
```

macOS/Linux:

```bash
ifconfig
```

Use the local IPv4 address:

```env
EXPO_PUBLIC_API_URL=http://YOUR_IP:3001
```

---

## Android Emulator Cannot Connect

Use:

```text
http://10.0.2.2:3001
```

instead of:

```text
http://localhost:3001
```

---

## Database Connection Failed

Verify:

* PostgreSQL is running.
* Database exists.
* `DATABASE_URL` is correct.
* Prisma migrations are applied.

---

## Redis Connection Failed

Test:

```bash
redis-cli ping
```

Expected:

```text
PONG
```

---

## Physical Device Cannot Connect

Check:

1. Phone and computer are connected to the same Wi-Fi.
2. Backend is listening on port `3001`.
3. Windows Firewall allows port `3001`.
4. `EXPO_PUBLIC_API_URL` uses the computer's LAN IP.
5. The backend is not bound only to `localhost`.

---

# 📊 Development Status

<div align="center">

![Development Status](https://img.shields.io/badge/Development-In%20Progress-5B5FEF?style=for-the-badge)

</div>

## Current Phase

### Capstone 1 — Research, Planning & System Architecture

Current activities:

* Research
* Manuscript development
* Technology selection
* System architecture
* UI/UX design
* Database planning
* AI pipeline planning
* API architecture

## Upcoming Phases

```text
┌──────────────────────────┐
│       CAPSTONE 1         │
│ Research & Architecture  │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│       CAPSTONE 2         │
│ Development & Implement. │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│       CAPSTONE 3         │
│ Testing & Deployment     │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│      FINAL SYSTEM        │
└──────────────────────────┘
```

---

# 👥 Contributors

## Team 5

| Member                    | Role      |
| ------------------------- | --------- |
| **Kevin Albert Nisperos** | Developer |
| **Genesis Diaz**          | Developer |
| **Jevan Adam Mulato**     | Developer |

---

# 👨‍🏫 Adviser

**Ryan N. Billera, LPT**

---

# 📄 License

SultiAI is released under the **MIT License**.

[![License](https://img.shields.io/badge/License-MIT-success?style=for-the-badge)](./LICENSE)

The complete license is available in the repository:

**[`LICENSE`](./LICENSE)**

```text
MIT License

Copyright (c) 2026 Team 5 - SultiAI

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

# 📞 Contact

For questions, collaboration, or project-related inquiries, please reach out to the SultiAI development team.

---

# 🌏 Why SultiAI?

Language learning is not only about memorizing vocabulary.

Real communication requires understanding:

* Context
* Tone
* Situation
* Intent
* Cultural meaning
* Appropriate responses

SultiAI is designed around this principle.

```text
              TRADITIONAL TRANSLATOR

                    WORD
                     │
                     ▼
                TRANSLATION
                     │
                     ▼
                   RESULT


                       VS


                     SULTIAI

                    SPEECH
                      │
                      ▼
                   CONTEXT
                      │
                      ▼
                    INTENT
                      │
                      ▼
                  SITUATION
                      │
                      ▼
                RECOMMENDATION
                      │
                      ▼
                   LEARNING
                      │
                      ▼
                  CONFIDENCE
```

---

# 💜 Built for Communication

<div align="center">

### Speak naturally.

### Learn continuously.

### Understand the culture.

### Communicate confidently.

<br>

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:0D9488,50:2563EB,100:5B5FEF&height=140&section=footer&animation=twinkling" width="100%"/>

<br>

<img src="https://readme-typing-svg.demolab.com?font=Inter&weight=600&size=18&duration=3500&pause=1000&color=0D9488&center=true&vCenter=true&width=650&lines=Built+with+%E2%9D%A4%EF%B8%8F+by+Team+5;SultiAI+%E2%80%94+AI+Language+Companion;Learn+%E2%80%A2+Speak+%E2%80%A2+Understand+%E2%80%A2+Connect" alt="Footer typing animation"/>

<br><br>

![GitHub](https://img.shields.io/badge/GitHub-SultiAI-181717?style=flat-square\&logo=github)
![Made in Davao](https://img.shields.io/badge/Made%20in-Davao%20City-5B5FEF?style=flat-square)
![Year](https://img.shields.io/badge/2026-Project-0D9488?style=flat-square)

<br><br>

**SultiAI — AI Language Companion for Context-Aware Communication**

<br>

*Last Updated: September 2026*

</div>

