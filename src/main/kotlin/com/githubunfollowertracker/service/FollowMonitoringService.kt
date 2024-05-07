package com.githubunfollowertracker.service

import com.githubunfollowertracker.dto.GitHubUser
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import okhttp3.OkHttpClient
import okhttp3.Request
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service

/**
 * Service responsible for fetching user following and followers lists from the GitHub API.
 */
@Service
class FollowMonitoringService(private val httpClient: OkHttpClient, private val gson: Gson) {

    @Value("\${github.api.url}")
    private lateinit var githubApiUrl: String

    /**
     * Retrieves the list of users that the specified user is following.
     *
     * @param userName The GitHub username
     * @param credentials The OAuth2 access token for authentication
     * @return The list of GitHub users being followed
     */
    fun getFollowingList(userName: String, credentials: String, page: Int): List<GitHubUser> {
        val url = "$githubApiUrl/users/$userName/following?per_page=9&page=$page"
        return makeApiCall(url, credentials)
    }

    /**
     * Retrieves the list of users following the specified user.
     *
     * @param userName The GitHub username
     * @param credentials The OAuth2 access token for authentication
     * @return The list of GitHub users who are followers
     */
    fun getFollowersList(userName: String, credentials: String, page: Int): List<GitHubUser> {
        val url = "$githubApiUrl/users/$userName/followers?per_page=9&page=$page"
        return makeApiCall(url, credentials)
    }

    /**
     * Makes an API call to the specified URL with the provided OAuth2 access token.
     *
     * @param url The URL to make the API call to
     * @param credentials The OAuth2 access token for authentication
     * @return The list of GitHub users returned from the API call
     * @throws RuntimeException if the API call fails or the response is not successful
     */
    private fun makeApiCall(url: String, credentials: String): List<GitHubUser> {
        val request = Request.Builder()
            .url(url)
            .header("Authorization", "Bearer $credentials")
            .get()
            .build()

        val response = httpClient.newCall(request).execute()
        val responseBody = response.body?.string()

        if (!response.isSuccessful || responseBody == null)
            throw RuntimeException("Failed to fetch data from GitHub, Response: $responseBody")

        val userListType = object : TypeToken<List<GitHubUser>>() {}.type
        return gson.fromJson(responseBody, userListType)
    }
}
