package com.githubunfollowertracker.controller

import org.springframework.stereotype.Controller
import org.springframework.web.bind.annotation.GetMapping

// Controller responsible for handling page view routing
@Controller
class ViewController {

    // Mapping for the root URL that loads the main view page
    @GetMapping("/")
    fun showUnfollowPage(): String {
        return "main" // Returns the name of the Thymeleaf template to render (main.html)
    }
}
