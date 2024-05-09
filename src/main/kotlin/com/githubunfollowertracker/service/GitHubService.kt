package com.githubunfollowertracker.service

import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
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
     * Retrieves a complete list of users that the specified user is following.
     * This method pages through the GitHub API results until no more data is returned.
     * @param userName The username for which to fetch the complete following list
     * @param credentials The access token or credentials for authentication
     * @return Complete list of usernames that the specified user is following
     */
    fun fetchAllFollowing(userName: String, credentials: String): List<String> {
        var page = 1 // Start from the first page
        val allFollowing = mutableListOf<String>() // Initialize an empty list to store all following users

        while (true) {
            val url = "$githubApiUrl/users/$userName/following?per_page=100&page=$page" // Construct URL with pagination
            val newFollowing = makeApiCall(url, credentials, "GET") // Fetch the following list for the page
            if (newFollowing.isEmpty()) {
                break // If no new users are found, end the loop
            }
            allFollowing.addAll(newFollowing) // Add the new users to the complete list
            page++ // Move to the next page
        }

        return allFollowing // Return the complete list of following users
    }

    /**
     * Retrieves a complete list of users who are followers of the specified user.
     * This method iterates over the GitHub API pages until it receives an empty response.
     * @param userName The username for which to fetch the complete followers list
     * @param credentials The access token or credentials for authentication
     * @return Complete list of usernames who are followers of the specified user
     */
    fun fetchAllFollowers(userName: String, credentials: String): List<String> {
        var page = 1 // Start from the first page
        val allFollowers = mutableListOf<String>() // Initialize an empty list to store all followers

        while (true) {
            val url = "$githubApiUrl/users/$userName/followers?per_page=100&page=$page" // Construct URL with pagination
            val newFollowers = makeApiCall(url, credentials, "GET") // Fetch the followers list for the page
            if (newFollowers.isEmpty()) {
                break // If no new users are found, end the loop
            }
            allFollowers.addAll(newFollowers) // Add the new users to the complete list
            page++ // Move to the next page
        }

        return allFollowers // Return the complete list of followers
    }

    /**
     * Unfollows a user on behalf of the specified user.
     * @param userName The username of the authenticated user
     * @param userToUnfollow The username of the user to unfollow
     * @param credentials The access token or credentials for authentication
     */
    suspend fun unfollowUser(userName: String, userToUnfollow: String, credentials: String) = withContext(Dispatchers.IO) {
        val url = "$githubApiUrl/user/following/$userToUnfollow"
        val request = Request.Builder()
            .url(url)
            .delete()
            .header("Authorization", "Bearer $credentials")
            .build()

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
