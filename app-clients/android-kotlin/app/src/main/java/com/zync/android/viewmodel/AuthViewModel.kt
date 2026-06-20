package com.zync.android.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.zync.android.models.SyncRequest
import com.zync.android.repository.AuthRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

sealed class AuthState {
    object Idle : AuthState()
    object Loading : AuthState()
    data class Success(val uid: String) : AuthState()
    data class Error(val message: String) : AuthState()
}

class AuthViewModel : ViewModel() {
    private val repository = AuthRepository()

    private val _authState = MutableStateFlow<AuthState>(AuthState.Idle)
    val authState: StateFlow<AuthState> = _authState

    // In a real app, this is called after Firebase Auth succeeds
    fun syncWithBackend(firebaseToken: String, uid: String, email: String, name: String) {
        _authState.value = AuthState.Loading
        viewModelScope.launch {
            val request = SyncRequest(uid, email, name, null, null)
            val result = repository.syncUser(firebaseToken, request)
            result.onSuccess { response ->
                _authState.value = AuthState.Success(response.user.id)
            }.onFailure { error ->
                _authState.value = AuthState.Error(error.message ?: "Sync Error")
            }
        }
    }
}
