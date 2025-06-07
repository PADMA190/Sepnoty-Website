# Automation Agent

This project is an automation agent that can perform tasks such as web automation, API interaction, and more.

## Features

- Web automation using Selenium
- Task queuing using Bull
- NLP capabilities using Natural, including basic intent recognition, entity extraction, and a clarification mechanism if essential information is missing from user input.

## Getting Started

### Prerequisites

- Node.js
- npm
- Redis (for task queuing, ensure Redis server is running. Default connection: `redis://127.0.0.1:6379`)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/automation-agent.git
   ```
2. Install dependencies:
   ```bash
   cd automation-agent
   npm install
   ```

### Usage

1.  **Start the API Server:**
    ```bash
    npm start
    ```
    Or for development with auto-restarts:
    ```bash
    npm run dev
    ```

2.  **Start the Automation Worker:**
    Open a new terminal window/tab in the project root and run:
    ```bash
    npm run worker
    ```
    The worker will connect to Redis and start processing tasks from the queue.

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository.
2. Create a new branch.
3. Make your changes.
4. Submit a pull request.

## Security, Authentication, and Payments

-   **Authentication:** The current version of this agent **does not implement real user authentication** for the automated platforms (Amazon, Swiggy, RedBus). Functions like `checkAndHandleLogin...` are placeholders to indicate where login checks or session handling would occur. They currently simulate these checks or assume public access. Integrating real authentication would require secure handling of user credentials (e.g., via OAuth tokens, secure session management) and is a significant security undertaking.
-   **Payment Processing:** Real payment processing (e.g., credit card entry, UPI transactions) is **not implemented**. Console logs such as "Payment processing placeholder" indicate conceptual points in the automation scripts where payment integration would be necessary. Handling actual payments involves strict security measures, PCI DSS compliance (for card payments), and integration with payment gateways.
-   **Sensitive Data:** In a production system, handling sensitive data like login credentials, API keys, and payment information would necessitate robust security practices, including:
    *   Encryption at rest and in transit.
    *   Secure storage solutions (e.g., HashiCorp Vault, AWS KMS).
    *   Restricted access controls.
    *   Regular security audits.
-   **User Credentials Warning:** Users should **never be asked to provide passwords directly** to this system in its current form. For a production-ready application, secure authentication mechanisms like OAuth 2.0, SAML, or a dedicated identity provider should be used to manage user sessions without directly handling passwords.

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.
