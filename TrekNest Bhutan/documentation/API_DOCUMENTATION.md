# API Documentation for TrekNest Bhutan

## Overview

This document provides an overview of the API endpoints available in the TrekNest Bhutan application. The API is designed to facilitate communication between the frontend and backend, allowing users to interact with the system for various functionalities such as user authentication, trekking information, accommodation management, and bookings.

## Base URL

The base URL for all API endpoints is:

```
http://localhost:5000/api
```

## Authentication

### User Registration

- **Endpoint**: `/auth/register`
- **Method**: POST
- **Request Body**:
  ```json
  {
    "username": "string",
    "password": "string",
    "email": "string"
  }
  ```
- **Response**:
  - **201 Created**: User registered successfully.
  - **400 Bad Request**: Validation errors.

### User Login

- **Endpoint**: `/auth/login`
- **Method**: POST
- **Request Body**:
  ```json
  {
    "username": "string",
    "password": "string"
  }
  ```
- **Response**:
  - **200 OK**: Login successful, returns user data and token.
  - **401 Unauthorized**: Invalid credentials.

## Trekking Routes

### Get All Treks

- **Endpoint**: `/treks`
- **Method**: GET
- **Response**:
  - **200 OK**: Returns a list of all trekking routes.

### Get Trek Details

- **Endpoint**: `/treks/{id}`
- **Method**: GET
- **Response**:
  - **200 OK**: Returns details of the specified trek.
  - **404 Not Found**: Trek not found.

## Accommodations

### Get All Accommodations

- **Endpoint**: `/accommodations`
- **Method**: GET
- **Response**:
  - **200 OK**: Returns a list of all accommodations.

### Get Accommodation Details

- **Endpoint**: `/accommodations/{id}`
- **Method**: GET
- **Response**:
  - **200 OK**: Returns details of the specified accommodation.
  - **404 Not Found**: Accommodation not found.

## Bookings

### Create Booking

- **Endpoint**: `/bookings`
- **Method**: POST
- **Request Body**:
  ```json
  {
    "user_id": "integer",
    "accommodation_id": "integer",
    "check_in": "date",
    "check_out": "date"
  }
  ```
- **Response**:
  - **201 Created**: Booking created successfully.
  - **400 Bad Request**: Validation errors.

### Get Booking Confirmation

- **Endpoint**: `/bookings/{id}`
- **Method**: GET
- **Response**:
  - **200 OK**: Returns booking confirmation details.
  - **404 Not Found**: Booking not found.

## Admin Functions

### Manage Users

- **Endpoint**: `/admin/users`
- **Method**: GET
- **Response**:
  - **200 OK**: Returns a list of all users.

### Manage Images

- **Endpoint**: `/admin/images`
- **Method**: GET
- **Response**:
  - **200 OK**: Returns a list of all images.

## Error Handling

All API responses will include an appropriate HTTP status code and a message detailing the error if applicable.

## Conclusion

This API documentation provides a comprehensive overview of the available endpoints for the TrekNest Bhutan application. For further details or updates, please refer to the project documentation or contact the development team.