![image](https://github.com/krkarma777/GitHubUnfollowerTracker/assets/149022496/bc8a1f23-b332-4320-92a3-0b4533ed4499)


# GitHubUnfollowerTracker

## Project Description

GitHubUnfollowerTracker is a sleek, web-based application that enables users to effectively manage and monitor their GitHub social connections. Leveraging the GitHub API, it provides real-time insights into follower dynamics, allowing users to identify who has unfollowed them and manage their following list more efficiently. This tool is built using Kotlin and Spring Boot, offering a responsive and user-friendly interface.

===

### Version 2 Release Notes

#### New Features
- **Whitelist Management**: Users can now specify a whitelist of usernames to exempt from the unfollow process. This is done through a new input field in the Unfollow Users form, which supports comma-separated usernames.
- **Asynchronous Processing**: Implemented asynchronous processing using Kotlin coroutines. This update includes:
  - **kotlinx-coroutines-core dependency**: Added for asynchronous processing capabilities.
  - **kotlinx-coroutines-reactor dependency**: Supports integration with Reactor for combining reactive programming with coroutines.
  - **Refactored `unfollowUser`**: Now utilizes coroutines to handle asynchronous execution, improving performance when processing multiple unfollow requests simultaneously.

#### Enhancements
- **Optimized Follower Filtering Logic**: Improved the logic for filtering followers in the unfollow endpoint, enhancing efficiency and response times.
- **Enhanced Code Documentation**: Updated and expanded the code documentation for the `GitHubController`, making it easier to understand and maintain.

#### Technical Improvements
- Enhanced the stability and performance of the follower management tools.
- Improved error handling for rate limit issues with GitHub's API.

### Known Issues
- No major issues reported in this release. Users experiencing any difficulties should report them for immediate review.

#### Upgrade Notes
- Users are encouraged to update to the latest version to take advantage of the new features and improvements.
- Ensure compatibility with existing deployments, especially concerning asynchronous operations and external API integrations.

This release focuses on improving user control over social interactions on GitHub and optimizing backend operations for better performance and usability.

===

## Features

- **Monitor Unfollowers**: Instantly find out who has stopped following you.
- **Manage Following List**: View and manage your current GitHub following list.
- **Automatic Updates**: Stay informed with automatic updates reflecting any changes in your social graph.
- **Enhanced User Interface**: Enjoy a modern interface that simplifies navigation and enhances user interaction.

## Getting Started

These instructions will guide you through setting up the project on your local machine for development and testing purposes.

### Prerequisites

- JDK 17 or newer
- Spring Boot 3.2.5
- Gradle or Maven as your build tool
- GitHub API credentials

### Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/yourusername/GitHubUnfollowerTracker.git
   cd GitHubUnfollowerTracker
   ```

2. **Set up application properties:**

   Modify `src/main/resources/application-dev.properties` to include your GitHub API credentials:

   ```properties
   github.api.url=https://api.github.com
   
   # OAuth2 Client Configuration
   spring.security.oauth2.client.registration.github.client-id={your-client-id}
   spring.security.oauth2.client.registration.github.client-secret={your-client-secret}
   spring.security.oauth2.client.registration.github.scope=read:user, user:email, user:follow
   ```

3. **Build the project:**

   Using Gradle:

   ```bash
   ./gradlew build
   ```

   Or Maven:

   ```bash
   mvn clean install
   ```

4. **Run the application:**

   ```bash
   ./gradlew bootRun
   ```

   Or with Maven:

   ```bash
   mvn spring-boot:run
   ```

   Visit `http://localhost:8090` in your browser.

## Usage

Access the application by navigating to `http://localhost:8090` in your browser. Sign in using your GitHub credentials to authorize the application and start managing your follower and following lists.

## Contributing

Contributions are welcome and greatly appreciated. Here’s how you can contribute:

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Acknowledgments

- Hat tip to GitHub for the API used in this application.
- A huge thank you to all contributors and the open-source community for continuous support.
