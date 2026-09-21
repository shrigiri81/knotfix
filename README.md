# KnotFix

A simple issue tracking app for managing projects, issues, members, and comments.

I built this while learning Spring Boot and React. I was mainly exploring authentication, authorization, JPA relationships, REST APIs, and how the frontend and backend fit together.

## Features

- User authentication
- Project and member management
- Create, edit, assign, and track issues
- Issue status and priority
- Comments and replies
- Basic ownership-based permissions
- User profiles

## Tech Stack

### Backend

- Java 21
- Spring Boot
- Spring Security
- Spring Data JPA / Hibernate
- PostgreSQL
- Gradle

### Frontend

- React
- Vite
- Axios
- Lucide React

## Structure

```text
React + Vite
     │
     │ REST API
     ▼
Spring Boot
     │
     │ JPA / Hibernate
     ▼
PostgreSQL
```

## Running locally

### Backend

Update the database settings in:

```text
src/main/resources/application.properties
```

```bash
./gradlew bootRun
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Screenshots

<p align="center">
  <img src="./Screenshots/Screenshot%202026-09-21%20at%2015-23-03%20KnotFix%20%E2%80%94%20Issue%20Tracker.png" width="48%">
  <img src="./Screenshots/Screenshot%202026-09-21%20at%2015-24-10%20KnotFix%20%E2%80%94%20Issue%20Tracker.png" width="48%">
</p>

<p align="center">
  <img src="./Screenshots/Screenshot%202026-09-21%20at%2015-24-31%20KnotFix%20%E2%80%94%20Issue%20Tracker.png" width="48%">
  <img src="./Screenshots/Screenshot%202026-09-21%20at%2015-24-43%20KnotFix%20%E2%80%94%20Issue%20Tracker.png" width="48%">
</p>

## Status

This is a learning/portfolio project. It's mostly done, and I'm moving on to other projects rather than continuously adding features to it.

## License

MIT
