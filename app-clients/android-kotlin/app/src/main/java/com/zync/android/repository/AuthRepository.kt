package com.zync.android.repository

import com.zync.android.api.ApiClient
import com.zync.android.models.AuthResponse
import com.zync.android.models.SyncRequest

class AuthRepository {
    private val authService = ApiClient.authService

    suspend fun syncUser(firebaseToken: String, request: SyncRequest): Result<AuthResponse> {
        return try {
            val response = authService.syncUser("Bearer $firebaseToken", request)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Sync failed: " + response.message()))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
