package com.zync.android.models

data class User(
    val id: String,
    val email: String,
    val name: String,
    val avatarUrl: String? = null,
    val role: String
)
