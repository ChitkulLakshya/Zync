package com.zync.android.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.zync.android.models.LoginRequest
import com.zync.android.repository.AuthRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

sealed class AuthState {
    object Idle : AuthState()
    object Loading : AuthState()
    data class Success(val token: String) : AuthState()
    data class Error(val message: String) : AuthState()
}

class AuthViewModel : ViewModel() {
    private val repository = AuthRepository()

    private val _authState = MutableStateFlow<AuthState>(AuthState.Idle)
    val authState: StateFlow<AuthState> = _authState

    fun login(email: String, passwordHash: String) {
        _authState.value = AuthState.Loading
        viewModelScope.launch {
            val result = repository.login(LoginRequest(email, passwordHash))
            result.onSuccess { response ->
                _authState.value = AuthState.Success(response.token)
            }.onFailure { error ->
                _authState.value = AuthState.Error(error.message ?: "Unknown Error")
            }
        }
    }
}
