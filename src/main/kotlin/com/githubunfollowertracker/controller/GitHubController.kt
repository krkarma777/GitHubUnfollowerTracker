package com.githubunfollowertracker.controller

import com.githubunfollowertracker.service.GetAccessTokenService
import com.githubunfollowertracker.service.GitHubService
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.ResponseEntity
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

// Controller to manage GitHub user following and unfollowing
@RestController
class GitHubController @Autowired constructor(
    private val gitHubService: GitHubService, // Service to handle GitHub API interactions
    private val getAccessTokenService: GetAccessTokenService
) {

    // Endpoint to unfollow users not following back the authenticated user
    @PostMapping("/unfollow")
    fun unfollow(
        oAuth2AuthenticationToken: OAuth2AuthenticationToken, // Authentication token for OAuth2
        @RequestParam(required = false) whiteList: List<String> = listOf() // Optional whitelist of users to keep following
    ): ResponseEntity<String> {
        val credentials =
            getAccessTokenService.getAccessToken(oAuth2AuthenticationToken) as String // Fetch access token
        val userName =
            oAuth2AuthenticationToken.principal.attributes["login"] as String // Extract user's login from token
        val following = gitHubService.fetchFollowing(
            userName,
            credentials
        ) // Fetch list of users the authenticated user is following
        val followers = gitHubService.fetchFollowers(userName, credentials) // Fetch list of followers

        // Unfollow users who do not follow back and are not in the whitelist
        following.filterNot { follower -> followers.any { it == follower } || whiteList.contains(follower) }
            .forEach { userToUnfollow ->
                gitHubService.unfollowUser(userName, userToUnfollow, credentials)
            }

        return ResponseEntity.ok("Unfollowed non-followers successfully.")
    }
}
