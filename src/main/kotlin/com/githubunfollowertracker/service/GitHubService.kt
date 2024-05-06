package com.githubunfollowertracker.service

import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import okhttp3.*
import org.springframework.stereotype.Service
import java.io.IOException

@Service
class GitHubService {

    private val client = OkHttpClient()
    private val gson = Gson()

    fun unfollowUser(credentials: String, target: String) {
        val request = Request.Builder()
            .url("https://api.github.com/user/following/$target")
            .delete()
            .header("Authorization", credentials)
            .header("User-Agent", "Patassaura")
            .build()

        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) throw IOException("Unexpected code $response")
        }

        println("Unfollowed $target")
    }

    fun followedUsers(credentials: String, currentPage: Int): List<Map<String, Any>> {
        val request = Request.Builder()
            .url("https://api.github.com/user/following?page=$currentPage")
            .get()
            .header("Authorization", credentials)
            .header("User-Agent", "Patassaura")
            .build()

        client.newCall(request).execute().use { response ->
            return gson.fromJson(response.body?.string(), object : TypeToken<List<Map<String, Any>>>() {}.type)
        }
    }

    fun checkFollowBack(credentials: String, target: String, user: String): Boolean {
        val request = Request.Builder()
            .url("https://api.github.com/users/$target/following/$user")
            .get()
            .header("User-Agent", "Patassaura")
            .build()

        client.newCall(request).execute().use { response ->
            return response.code == 404
        }
    }

    fun unfollowAll(credentials: String, username: String, followed: List<Map<String, Any>>, whiteList: List<String>) {
        followed.forEach {
            val targetUser = it["login"] as String
            if (!whiteList.contains(targetUser) && checkFollowBack(credentials, targetUser, username)) {
                unfollowUser(credentials, targetUser)
            }
        }
    }
}
