# Mergington High School Activities API

A simple FastAPI application for browsing extracurricular activities and, with the right role, managing student registrations.

## Features

- View all available extracurricular activities without signing in
- Sign in with a seeded local account to manage registrations
- Enforce server-side role checks for signup and unregister actions
- Show current session and role in the web UI

## Getting Started

1. Install the dependencies:

   ```
   pip install -r ../requirements.txt
   ```

2. Start the API from the `src` directory:

   ```
   uvicorn app:app --reload
   ```

3. Open your browser and go to:
   - App UI: http://localhost:8000/static/index.html
   - API documentation: http://localhost:8000/docs
   - Alternative documentation: http://localhost:8000/redoc

## Authentication Flow

Seeded users live in `users.json` so the app stays local and development-friendly.

Available demo accounts:

| Username | Password | Role |
| -------- | -------- | ---- |
| `student1` | `studentpass` | `student` |
| `clubadmin` | `clubadminpass` | `club_admin` |
| `supervisor` | `supervisorpass` | `supervisor` |
| `principal` | `principalpass` | `institution_admin` |

Role behavior:

- `student` can browse activities but cannot register or unregister anyone.
- `club_admin`, `supervisor`, and `institution_admin` can manage registrations.
- Protected endpoints return `401` when there is no valid token and `403` when the logged-in role is not allowed.

## API Endpoints

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/activities` | Get all activities with their details and participant lists |
| POST | `/auth/login` | Create a bearer-token session using a JSON body with `username` and `password` |
| GET | `/auth/session` | Inspect the current session for the supplied bearer token |
| POST | `/auth/logout` | End the current bearer-token session |
| POST | `/activities/{activity_name}/signup?email=student@mergington.edu` | Register a student for an activity; requires staff role |
| DELETE | `/activities/{activity_name}/unregister?email=student@mergington.edu` | Remove a student from an activity; requires staff role |

## Data Model

The application still uses an in-memory activity store, which means activity changes reset when the server restarts. Authentication uses a local JSON file for demo users and in-memory bearer-token sessions.
