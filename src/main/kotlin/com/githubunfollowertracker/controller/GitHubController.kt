package com.githubunfollowertracker.controller

import com.githubunfollowertracker.service.GitHubService
import okhttp3.Credentials
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.web.bind.annotation.*

@RestController
class GitHubController @Autowired constructor(private val gitHubService: GitHubService) {

    @PostMapping("/unfollow")
    fun unfollow(@RequestParam username: String, @RequestParam password: String, @RequestParam(required = false) whiteList: List<String> = listOf()) {
        val credentials = Credentials.basic(username, password)
        var currentPage = 1
        while (true) {
            val followed = gitHubService.followedUsers(credentials, currentPage)
            if (followed.isEmpty()) break
            gitHubService.unfollowAll(credentials, username, followed, whiteList)
            currentPage++
        }
    }
}
