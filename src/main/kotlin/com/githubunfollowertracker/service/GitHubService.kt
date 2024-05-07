package com.githubunfollowertracker.service

import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import okhttp3.OkHttpClient
import okhttp3.Request
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service

@Service
class GitHubService(private val httpClient: OkHttpClient, private val gson: Gson) {

    @Value("\${github.api.url}")
    private lateinit var githubApiUrl: String

    fun fetchFollowing(userName: String, credentials: String): List<String> {
        val url = "$githubApiUrl/users/$userName/following"
        return makeApiCall(url, credentials, "GET")
    }

    fun fetchFollowers(userName: String, credentials: String): List<String> {
        val url = "$githubApiUrl/users/$userName/followers"
        return makeApiCall(url, credentials, "GET")
    }

    fun unfollowUser(userName: String, userToUnfollow: String, credentials: String) {
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

    private fun makeApiCall(url: String, credentials: String, method: String): List<String> {
        val builder = Request.Builder()
            .url(url)
            .header("Authorization", "Bearer $credentials")

        val request = when (method) {
            "GET" -> builder.get().build()
            else -> throw IllegalArgumentException("Unsupported HTTP method: $method")
        }

        return httpClient.newCall(request).execute().use { response ->
            val responseBody = response.body?.string()
            if (!response.isSuccessful || responseBody == null)
                throw RuntimeException("Failed to fetch data from GitHub, Response: $responseBody")

            val type = object : TypeToken<List<Map<String, String>>>() {}.type
            val result: List<Map<String, String>> = gson.fromJson(responseBody, type)
            return result.map { it["login"] ?: throw IllegalStateException("Unexpected GitHub API response format") }
        }
    }
}
