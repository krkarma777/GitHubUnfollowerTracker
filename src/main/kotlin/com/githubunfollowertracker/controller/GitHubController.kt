package com.githubunfollowertracker.controller

import com.githubunfollowertracker.dto.GitHubUser
import com.githubunfollowertracker.service.FollowMonitoringService
import com.githubunfollowertracker.service.GetAccessTokenService
import com.githubunfollowertracker.service.GitHubService
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.ResponseEntity
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

/**
 * This controller manages operations related to GitHub user interactions,
 * specifically focusing on following and unfollowing users.
 */
@RestController
class GitHubController @Autowired constructor(
    private val gitHubService: GitHubService, // Handles interactions with GitHub API
    private val getAccessTokenService: GetAccessTokenService, // Retrieves OAuth2 access tokens
    private val followMonitoringService: FollowMonitoringService // Monitors follow and unfollow activities
) {

    /**
     * Unfollows users who do not reciprocate the follow back to the authenticated user,
     * considering an optional whitelist of users to remain following.
     *
     * @param oAuth2AuthenticationToken Provides the OAuth2 authentication context.
     * @param whiteList Optional list of usernames to be excluded from unfollowing.
     * @return A ResponseEntity with the result of the unfollow operation.
     */
    @PostMapping("/unfollow")
    suspend fun unfollow(
        oAuth2AuthenticationToken: OAuth2AuthenticationToken,
        @RequestParam(required = false) whiteList: List<String> = listOf()
    ): ResponseEntity<String> = coroutineScope {
        val credentials = getAccessTokenService.getAccessToken(oAuth2AuthenticationToken) as String
        val userName = oAuth2AuthenticationToken.principal.attributes["login"] as String

        val following = gitHubService.fetchAllFollowing(userName, credentials)
        val followers = gitHubService.fetchAllFollowers(userName, credentials)

        following.filterNot { it in followers || it in whiteList }
            .forEach { userToUnfollow ->
                launch {
                    gitHubService.unfollowUser(userName, userToUnfollow, credentials)
                }
            }

        ResponseEntity.ok("Unfollowed non-followers successfully.")
    }

    /**
     * Retrieves a list of followers for the authenticated user.
     *
     * @param oAuth2AuthenticationToken Provides the OAuth2 authentication context.
     * @param page Specifies the pagination index for the followers list.
     * @return A ResponseEntity containing a list of GitHubUser representing followers.
     */
    @GetMapping("/follower")
    fun followerList(oAuth2AuthenticationToken: OAuth2AuthenticationToken,
                     @RequestParam page: Int): ResponseEntity<List<GitHubUser>> {
        val credentials = getAccessTokenService.getAccessToken(oAuth2AuthenticationToken) as String
        val userName = oAuth2AuthenticationToken.principal.attributes["login"] as String

        return ResponseEntity.ok(followMonitoringService.getFollowersList(userName, credentials, page))
    }

    /**
     * Retrieves a list of users that the authenticated user is following.
     *
     * @param oAuth2AuthenticationToken Provides the OAuth2 authentication context.
     * @param page Specifies the pagination index for the following list.
     * @return A ResponseEntity containing a list of GitHubUser representing users being followed.
     */
    @GetMapping("/following")
    fun followingList(oAuth2AuthenticationToken: OAuth2AuthenticationToken,
                      @RequestParam page: Int): ResponseEntity<List<GitHubUser>> {
        val credentials = getAccessTokenService.getAccessToken(oAuth2AuthenticationToken) as String
        val userName = oAuth2AuthenticationToken.principal.attributes["login"] as String

        return ResponseEntity.ok(followMonitoringService.getFollowingList(userName, credentials, page))
    }
}
