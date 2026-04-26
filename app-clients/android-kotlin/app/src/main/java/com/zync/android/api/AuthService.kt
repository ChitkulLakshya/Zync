package com.zync.android.api

import com.zync.android.models.AuthResponse
import com.zync.android.models.LoginRequest
import com.zync.android.models.RegisterRequest
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.POST

interface AuthService {
    @POST("api/users/login")
    suspend fun login(@Body request: LoginRequest): Response<AuthResponse>

    @POST("api/users/register")
    suspend fun register(@Body request: RegisterRequest): Response<AuthResponse>
}
