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

@RestController
class GitHubController @Autowired constructor(
    private val gitHubService: GitHubService,
    private val clientService: OAuth2AuthorizedClientService
) {

    @GetMapping("/unfollow")
    fun unfollow(
        oAuth2AuthenticationToken: OAuth2AuthenticationToken,
        @RequestParam(required = false) whiteList: List<String> = listOf()
    ): ResponseEntity<String> {
        val credentials = getAccessToken(oAuth2AuthenticationToken) as String
        val userName = oAuth2AuthenticationToken.principal.attributes["login"] as String
        val following = gitHubService.fetchFollowing(userName, credentials)
        val followers = gitHubService.fetchFollowers(userName, credentials)

        following.filterNot { follower -> followers.any { it == follower } }
            .forEach { userToUnfollow ->
                gitHubService.unfollowUser(userName, userToUnfollow, credentials)
            }

        return ResponseEntity.ok("Unfollowed non-followers successfully.")
    }

    fun getAccessToken(authentication: OAuth2AuthenticationToken): String? {
        val authorizedClient = clientService.loadAuthorizedClient<OAuth2AuthorizedClient>(
            "github", authentication.name
        )
        return authorizedClient?.accessToken?.tokenValue
    }
}
