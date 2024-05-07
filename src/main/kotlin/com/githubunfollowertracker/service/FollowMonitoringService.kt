package com.githubunfollowertracker.service

import com.githubunfollowertracker.dto.GitHubUser
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import okhttp3.OkHttpClient
import okhttp3.Request
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service

@Service
class FollowMonitoringService(private val httpClient: OkHttpClient, private val gson: Gson) {

    @Value("\${github.api.url}")
    private lateinit var githubApiUrl: String

    fun getFollowingList(userName: String, credentials: String): List<GitHubUser> {
        val url = "$githubApiUrl/users/$userName/following"
        return makeApiCall(url, credentials)
    }

    fun getFollowersList(userName: String, credentials: String): List<GitHubUser> {
        val url = "$githubApiUrl/users/$userName/followers"
        return makeApiCall(url, credentials)
    }

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
