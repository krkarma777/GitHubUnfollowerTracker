package com.githubunfollowertracker.controller

import org.springframework.stereotype.Controller
import org.springframework.web.bind.annotation.GetMapping

@Controller
class ViewController {

    @GetMapping("/")
    fun showUnfollowPage(): String {
        return "main"
    }
}
