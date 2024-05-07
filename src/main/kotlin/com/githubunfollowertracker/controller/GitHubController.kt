package com.githubunfollowertracker.controller

import com.githubunfollowertracker.service.GitHubService
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.ResponseEntity
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientService
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

// Controller to manage GitHub user following and unfollowing
@RestController
class GitHubController @Autowired constructor(
    private val gitHubService: GitHubService, // Service to handle GitHub API interactions
    private val clientService: OAuth2AuthorizedClientService // Service to manage OAuth2 clients
) {

    // Endpoint to unfollow users not following back the authenticated user
    @GetMapping("/unfollow")
    fun unfollow(
        oAuth2AuthenticationToken: OAuth2AuthenticationToken, // Authentication token for OAuth2
        @RequestParam(required = false) whiteList: List<String> = listOf() // Optional whitelist of users to keep following
    ): ResponseEntity<String> {
        val credentials = getAccessToken(oAuth2AuthenticationToken) as String // Fetch access token
        val userName = oAuth2AuthenticationToken.principal.attributes["login"] as String // Extract user's login from token
        val following = gitHubService.fetchFollowing(userName, credentials) // Fetch list of users the authenticated user is following
        val followers = gitHubService.fetchFollowers(userName, credentials) // Fetch list of followers

        // Unfollow users who do not follow back and are not in the whitelist
        following.filterNot { follower -> followers.any { it == follower } || whiteList.contains(follower) }
            .forEach { userToUnfollow ->
                gitHubService.unfollowUser(userName, userToUnfollow, credentials)
            }

        return ResponseEntity.ok("Unfollowed non-followers successfully.")
    }

    // Helper function to retrieve access token from authentication token
    fun getAccessToken(authentication: OAuth2AuthenticationToken): String? {
        val authorizedClient = clientService.loadAuthorizedClient<OAuth2AuthorizedClient>(
            "github", authentication.name
        )
        return authorizedClient?.accessToken?.tokenValue
    }
}
