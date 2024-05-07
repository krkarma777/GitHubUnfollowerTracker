package com.githubunfollowertracker.service

import org.springframework.security.oauth2.client.OAuth2AuthorizedClient
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientService
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken
import org.springframework.stereotype.Service

/**
 * Service responsible for retrieving OAuth2 access tokens for GitHub API requests.
 */
@Service
class GetAccessTokenService(
    private val clientService: OAuth2AuthorizedClientService // Service to manage OAuth2 clients
) {

    /**
     * Retrieves the access token from the provided OAuth2 authentication token.
     *
     * @param authentication The OAuth2 authentication token
     * @return The access token as a string, or null if not available
     */
    fun getAccessToken(authentication: OAuth2AuthenticationToken): String? {
        val authorizedClient = clientService.loadAuthorizedClient<OAuth2AuthorizedClient>(
            "github", authentication.name
        )
        return authorizedClient?.accessToken?.tokenValue
    }
}
