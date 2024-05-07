package com.githubunfollowertracker.service

import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import okhttp3.OkHttpClient
import okhttp3.Request
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service

/**
 * Service class to handle interactions with the GitHub API.
 * Provides methods for fetching user's following list, followers list, and unfollowing users.
 */
@Service
class GitHubService(private val httpClient: OkHttpClient, private val gson: Gson) {

    // Variable to store the base URL for the GitHub API. The value is set in application.properties.
    @Value("\${github.api.url}")
    private lateinit var githubApiUrl: String

    /**
     * Retrieves a list of users that the specified user is following.
     * @param userName The username for which to fetch the following list
     * @param credentials The access token or credentials for authentication
     * @return List of usernames that the specified user is following
     */
    fun fetchFollowing(userName: String, credentials: String): List<String> {
        // Construct URL for fetching following list
        val url = "$githubApiUrl/users/$userName/following"
        // Make API call and return the result
        return makeApiCall(url, credentials, "GET")
    }

    /**
     * Retrieves a list of users who are followers of the specified user.
     * @param userName The username for which to fetch the followers list
     * @param credentials The access token or credentials for authentication
     * @return List of usernames who are followers of the specified user
     */
    fun fetchFollowers(userName: String, credentials: String): List<String> {
        // Construct URL for fetching followers list
        val url = "$githubApiUrl/users/$userName/followers"
        // Make API call and return the result
        return makeApiCall(url, credentials, "GET")
    }

    /**
     * Unfollows a user on behalf of the specified user.
     * @param userName The username of the authenticated user
     * @param userToUnfollow The username of the user to unfollow
     * @param credentials The access token or credentials for authentication
     */
    fun unfollowUser(userName: String, userToUnfollow: String, credentials: String) {
        // Construct URL for unfollowing user
        val url = "$githubApiUrl/user/following/$userToUnfollow"
        // Create a DELETE request
        val request = Request.Builder()
            .url(url)
            .delete()
            .header("Authorization", "Bearer $credentials")
            .build()

        // Execute the request and handle response
        httpClient.newCall(request).execute().use { response ->
            if (!response.isSuccessful)
                throw RuntimeException("Failed to unfollow user: $userToUnfollow, Response: ${response.body?.string()}")
        }
    }

    /**
     * Helper method to make API calls to GitHub with the provided URL, credentials, and HTTP method.
     * @param url The URL for the API endpoint
     * @param credentials The access token or credentials for authentication
     * @param method The HTTP method (e.g., GET, POST, DELETE)
     * @return List of usernames retrieved from the API response
     */
    private fun makeApiCall(url: String, credentials: String, method: String): List<String> {
        val builder = Request.Builder()
            .url(url)
            .header("Authorization", "Bearer $credentials")

        // Construct the request based on the specified HTTP method
        val request = when (method) {
            "GET" -> builder.get().build()
            else -> throw IllegalArgumentException("Unsupported HTTP method: $method")
        }

        // Execute the request and handle response
        return httpClient.newCall(request).execute().use { response ->
            val responseBody = response.body?.string()
            if (!response.isSuccessful || responseBody == null)
                throw RuntimeException("Failed to fetch data from GitHub, Response: $responseBody")

            // Parse the response body and extract usernames
            val type = object : TypeToken<List<Map<String, String>>>() {}.type
            val result: List<Map<String, String>> = gson.fromJson(responseBody, type)
            return result.map { it["login"] ?: throw IllegalStateException("Unexpected GitHub API response format") }
        }
    }
}
