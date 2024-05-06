# GitHubUnfollowerTracker

## Project Description

GitHubUnfollowerTracker is a web application that enables GitHub users to track and monitor unfollow activities among the people they follow. Developed using Kotlin and Spring Boot, this application utilizes the GitHub API to retrieve users' follower and following lists, providing a simple and intuitive way to monitor changes over time.

## Features

- **Track Unfollowers**: Easily see who has unfollowed you since your last check.
- **View Following List**: Access a comprehensive list of everyone you are currently following on GitHub.
- **Real-Time Updates**: Receive updates as changes occur in your follower and following lists.
- **User-Friendly Interface**: Navigate the application with an intuitive interface designed for simplicity and ease of use.

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

- JDK 11 or newer
- Spring Boot 2.3+
- Maven
- Your GitHub API credentials

### Installation

1. **Clone the repository**

   ```
   git clone https://github.com/yourusername/GitHubUnfollowerTracker.git
   cd GitHubUnfollowerTracker
   ```

2. **Configure application properties**

   Open `src/main/resources/application.properties` and set your GitHub API credentials:

   ```
   github.client.id=YOUR_CLIENT_ID
   github.client.secret=YOUR_CLIENT_SECRET
   ```

3. **Build the project**

   ```
   mvn clean install
   ```

4. **Run the application**

   ```
   mvn spring-boot:run
   ```

   The application will start running at `http://localhost:8090`.

## Usage

Once the application is running, navigate to `http://localhost:8090` in your web browser to start tracking your GitHub unfollowers. Log in with your GitHub credentials to authorize the application to access your follower and following lists.

## Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Acknowledgments

- Thanks to GitHub for providing the API that makes this service possible.
- Special thanks to all contributors who have helped shape this project.
