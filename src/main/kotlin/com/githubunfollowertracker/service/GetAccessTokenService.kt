package com.githubunfollowertracker.service

import org.springframework.security.oauth2.client.OAuth2AuthorizedClient
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientService
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken
import org.springframework.stereotype.Service

@Service
class GetAccessTokenService(
    private val clientService: OAuth2AuthorizedClientService // Service to manage OAuth2 clients
) {

    // Helper function to retrieve access token from authentication token
    fun getAccessToken(authentication: OAuth2AuthenticationToken): String? {
        val authorizedClient = clientService.loadAuthorizedClient<OAuth2AuthorizedClient>(
            "github", authentication.name
        )
        return authorizedClient?.accessToken?.tokenValue
    }
}