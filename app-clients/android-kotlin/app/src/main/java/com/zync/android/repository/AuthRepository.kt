package com.zync.android.repository

import com.zync.android.api.ApiClient
import com.zync.android.models.AuthResponse
import com.zync.android.models.LoginRequest
import com.zync.android.models.RegisterRequest

class AuthRepository {
    private val authService = ApiClient.authService

    suspend fun login(request: LoginRequest): Result<AuthResponse> {
        return try {
            val response = authService.login(request)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Login failed: ${response.message()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun register(request: RegisterRequest): Result<AuthResponse> {
        return try {
            val response = authService.register(request)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Registration failed: ${response.message()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
