package com.zync.android.api

import com.zync.android.models.AuthResponse
import com.zync.android.models.SyncRequest
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.POST
import retrofit2.http.Header

interface AuthService {
    @POST("api/users/sync")
    suspend fun syncUser(
        @Header("Authorization") token: String,
        @Body request: SyncRequest
    ): Response<AuthResponse>
}
