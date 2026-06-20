package com.zync.android.models

data class SyncRequest(
    val uid: String,
    val email: String,
    val displayName: String?,
    val photoURL: String?,
    val phoneNumber: String?
)
