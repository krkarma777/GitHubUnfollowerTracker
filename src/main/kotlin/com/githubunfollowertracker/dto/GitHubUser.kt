package com.githubunfollowertracker.dto

/**
 * Data class representing GitHub user information retrieved from the GitHub API.
 *
 * @property login The GitHub user's login or username
 * @property id The unique identifier of the GitHub user
 * @property node_id The node ID of the GitHub user
 * @property avatar_url The URL of the GitHub user's avatar image
 * @property gravatar_id The Gravatar ID of the GitHub user
 * @property url The URL of the GitHub user's profile
 * @property html_url The HTML URL of the GitHub user's profile
 * @property followers_url The URL of the GitHub user's followers
 * @property following_url The URL of the GitHub user's following
 * @property gists_url The URL of the GitHub user's gists
 * @property starred_url The URL of the GitHub user's starred repositories
 * @property subscriptions_url The URL of the GitHub user's subscriptions
 * @property organizations_url The URL of the GitHub user's organizations
 * @property repos_url The URL of the GitHub user's repositories
 * @property events_url The URL of the GitHub user's events
 * @property received_events_url The URL of the GitHub user's received events
 * @property type The type of the GitHub user
 * @property site_admin A boolean indicating if the GitHub user is a site administrator
 */
data class GitHubUser(
    val login: String,
    val id: Long,
    val node_id: String,
    val avatar_url: String,
    val gravatar_id: String,
    val url: String,
    val html_url: String,
    val followers_url: String,
    val following_url: String,
    val gists_url: String,
    val starred_url: String,
    val subscriptions_url: String,
    val organizations_url: String,
    val repos_url: String,
    val events_url: String,
    val received_events_url: String,
    val type: String,
    val site_admin: Boolean
)