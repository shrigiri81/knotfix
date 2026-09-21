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
bun install
bun dev
```

## Screenshots

<p align="center"><strong>Dashboard</strong></p>
<p align="center">Personal workspace overview — assigned issues, workload stats, and recent activity at a glance.</p>
<p align="center">
  <img src="./Screenshots/Screenshot%202026-09-21%20at%2015-23-03%20KnotFix%20%E2%80%94%20Issue%20Tracker.png" width="90%">
</p>

<br>

<p align="center"><strong>Projects</strong></p>
<p align="center">Browse and manage all workspace projects, with progress bars and member info on each card.</p>
<p align="center">
  <img src="./Screenshots/Screenshot%202026-09-21%20at%2015-24-10%20KnotFix%20%E2%80%94%20Issue%20Tracker.png" width="90%">
</p>

<br>

<p align="center"><strong>Project Detail</strong></p>
<p align="center">Full issue list for a project — filterable by status and priority, with completion tracking in the sidebar.</p>
<p align="center">
  <img src="./Screenshots/Screenshot%202026-09-21%20at%2015-24-31%20KnotFix%20%E2%80%94%20Issue%20Tracker.png" width="90%">
</p>

<br>

<p align="center"><strong>Issue Detail</strong></p>
<p align="center">Issue thread with threaded comments, replies, and metadata like assignee, priority, and project link.</p>
<p align="center">
  <img src="./Screenshots/Screenshot%202026-09-21%20at%2015-24-43%20KnotFix%20%E2%80%94%20Issue%20Tracker.png" width="90%">
</p>

## Status

This is a learning/portfolio project. It's mostly done, and I'm moving on to other projects rather than continuously adding features to it.

## License

MIT
