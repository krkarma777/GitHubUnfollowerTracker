package com.githubunfollowertracker.controller

import com.githubunfollowertracker.service.FollowMonitoringService
import com.githubunfollowertracker.service.GetAccessTokenService
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken
import org.springframework.stereotype.Controller
import org.springframework.ui.Model
import org.springframework.web.bind.annotation.GetMapping

/**
 * Controller responsible for managing view routing and displaying the main page.
 */
@Controller
class ViewController @Autowired constructor(
    private val followMonitoringService: FollowMonitoringService, // Service for monitoring user following and followers
    private val getAccessTokenService: GetAccessTokenService // Service for retrieving OAuth2 access tokens
) {

    /**
     * Endpoint to show the main page for managing GitHub followers.
     * Retrieves user following and followers lists and adds them to the model for rendering.
     *
     * @param oAuth2AuthenticationToken The OAuth2 authentication token
     * @param model The Spring MVC model
     * @return The name of the Thymeleaf template to render
     */
    @GetMapping("/")
    fun showUnfollowPage(oAuth2AuthenticationToken: OAuth2AuthenticationToken, model: Model): String {
        val credentials = getAccessTokenService.getAccessToken(oAuth2AuthenticationToken) as String
        val userName =
            oAuth2AuthenticationToken.principal.attributes["login"] as String
        val following = followMonitoringService.getFollowingList(userName, credentials)
        val followers = followMonitoringService.getFollowersList(userName, credentials)

        model.addAttribute("following", following)
        model.addAttribute("followers", followers)
        return "main"
    }
}
