package com.zync.android.models

data class LoginRequest(
    val email: String,
    val passwordHash: String
)

data class RegisterRequest(
    val email: String,
    val name: String,
    val passwordHash: String
)
