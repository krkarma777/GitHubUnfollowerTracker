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
 * Controller to manage GitHub user following and unfollowing.
 */
@RestController
class GitHubController @Autowired constructor(
    private val gitHubService: GitHubService, // Service to handle GitHub API interactions
    private val getAccessTokenService: GetAccessTokenService, // Service to retrieve OAuth2 access token
    private val followMonitoringService: FollowMonitoringService
) {

    /**
     * Endpoint to unfollow users not following back the authenticated user.
     * @param oAuth2AuthenticationToken Authentication token for OAuth2
     * @param whiteList Optional whitelist of users to keep following
     * @return ResponseEntity indicating the result of the operation
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

    @GetMapping("/follower")
    fun followerList(oAuth2AuthenticationToken: OAuth2AuthenticationToken,
                     @RequestParam page: Int): ResponseEntity<List<GitHubUser>> {
        val credentials = getAccessTokenService.getAccessToken(oAuth2AuthenticationToken) as String
        val userName =
            oAuth2AuthenticationToken.principal.attributes["login"] as String

        return ResponseEntity.ok(followMonitoringService.getFollowersList(userName, credentials, page))
    }

    @GetMapping("/following")
    fun followingList(oAuth2AuthenticationToken: OAuth2AuthenticationToken,
                     @RequestParam page: Int): ResponseEntity<List<GitHubUser>> {
        val credentials = getAccessTokenService.getAccessToken(oAuth2AuthenticationToken) as String
        val userName =
            oAuth2AuthenticationToken.principal.attributes["login"] as String

        return ResponseEntity.ok(followMonitoringService.getFollowingList(userName, credentials, page))
    }
}