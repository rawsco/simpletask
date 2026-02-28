# Task Manager Frontend

React SPA for the Task Manager application built with TypeScript and Vite.

## Setup

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Create `.env` file from `.env.example`:
```bash
cp .env.example .env
```

3. Update the `VITE_API_BASE_URL` in `.env` with your API Gateway endpoint.

## Development

Run the development server:
```bash
npm run dev
```

The app will be available at http://localhost:3000

## Build

Build for production:
```bash
npm run build
```

The build output will be in the `dist` directory, ready for deployment to S3/CloudFront.

## Features

- User authentication (register, login, verify email, password reset)
- Session management with localStorage
- Protected routes for authenticated pages
- API client with request/response interceptors
- TypeScript for type safety

## Routes

- `/login` - Login page
- `/register` - Registration page
- `/verify` - Email verification page
- `/reset-password-request` - Request password reset
- `/reset-password` - Reset password with code
- `/tasks` - Task management (protected route)

## Environment Variables

- `VITE_API_BASE_URL` - Base URL for the API Gateway endpoint
