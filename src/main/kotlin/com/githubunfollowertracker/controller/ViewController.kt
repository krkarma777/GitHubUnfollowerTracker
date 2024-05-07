package com.githubunfollowertracker.controller

import org.springframework.stereotype.Controller
import org.springframework.web.bind.annotation.GetMapping

/**
 * Controller responsible for managing view routing and displaying the main page.
 * This version has been simplified to only handle view routing to the 'main' template.
 */
@Controller
class ViewController {

    /**
     * Endpoint to show the main page.
     * This method simply returns the name of the Thymeleaf template to render.
     *
     * @return The name of the Thymeleaf template ('main') to render.
     */
    @GetMapping("/")
    fun showUnfollowPage(): String {
        return "main"
    }
}
