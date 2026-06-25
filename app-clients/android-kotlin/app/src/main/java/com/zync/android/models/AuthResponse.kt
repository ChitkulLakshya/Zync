package com.zync.android.models

data class AuthResponse(
    val user: User,
    val token: String,
    val refreshToken: String
)

data class ErrorResponse(
    val message: String,
    val code: Int
)
