# Car Park Backend

This is the backend for a car park management system, built with Node.js, Express, TypeScript, and MongoDB.

## Prerequisites

- [Node.js](https://nodejs.org/) (v14 or later recommended)
- [MongoDB](https://www.mongodb.com/try/download/community)

## Installation

1.  **Clone the repository:**

2.  **Install dependencies:**
    ```bash
    npm install
    ```

## Configuration

1.  Create a `.env` file in the root directory of the project.

2.  Add the following configuration to your `.env` file. Adjust the `MONGO_URI` if your MongoDB instance is running elsewhere.

    ```env
    MONGO_URI=mongodb://localhost:27017/car-park
    PORT=3000
    ```

## Running the Application

### Development Mode

To run the server with hot-reloading for development, use:

```bash
npm run dev
```

The server will start on `http://localhost:3000` and automatically restart when you make changes to the source code.

### Production Mode

To build and run the application for production:

1.  **Build the TypeScript code:**
    ```bash
    npm run build
    ```
    This command compiles the TypeScript files from `src/` into JavaScript files in the `dist/` directory.

2.  **Start the server:**
    ```bash
    npm start
    ```
    This command runs the compiled application from the `dist/` directory.

## API Endpoints

Here is a summary of the available API endpoints.

### User Routes (Base URL: `/`)

-   `GET /:card_id`: Get public information and balance for a specific card.
-   `GET /:card_id/history`: Get the transaction history for a specific card.
-   `POST /:card_id/recharge`: Recharge a card (e.g., via a payment gateway).

### Admin Routes (Base URL: `/admin`)

#### User Management
-   `POST /users`: Create a new user.

#### Card & Transaction Management
-   `POST /cards`: Register a new card and assign it to a user.
-   `DELETE /cards/:card_id`: Deactivate a card.
-   `GET /cards/:card_id/history`: Get the complete transaction history for any card.
-   `POST /cards/:card_id/recharge`: Admin-level recharge for a card (e.g., cash top-up at a counter).
-   `POST /cards/:card_id/parking`: Record a parking transaction and deduct the fee from the card's balance.
