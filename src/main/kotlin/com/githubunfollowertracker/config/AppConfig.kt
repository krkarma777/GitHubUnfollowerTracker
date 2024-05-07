package com.githubunfollowertracker.config

import okhttp3.OkHttpClient
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import java.util.concurrent.TimeUnit

/**
 * Configuration class to define application beans and configurations.
 */
@Configuration
class AppConfig {

    /**
     * Bean definition for OkHttpClient with customized timeouts.
     * @return OkHttpClient instance
     */
    @Bean
    fun okHttpClient(): OkHttpClient {
        return OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS) // Set the connection timeout to 30 seconds
            .readTimeout(30, TimeUnit.SECONDS)    // Set the socket read timeout to 30 seconds
            .writeTimeout(30, TimeUnit.SECONDS)   // Set the socket write timeout to 30 seconds
            .build()
    }
}
