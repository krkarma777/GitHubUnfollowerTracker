package com.githubunfollowertracker.controller

import com.githubunfollowertracker.service.FollowMonitoringService
import com.githubunfollowertracker.service.GetAccessTokenService
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken
import org.springframework.stereotype.Controller
import org.springframework.ui.Model
import org.springframework.web.bind.annotation.GetMapping

@Controller
class ViewController @Autowired constructor(
    private val followMonitoringService: FollowMonitoringService,
    private val getAccessTokenService: GetAccessTokenService
) {

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
