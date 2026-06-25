package com.zync.android.viewmodel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.zync.android.repository.CoreRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
class DashboardViewModel : ViewModel() {
    private val repository = CoreRepository()
    private val _uiState = MutableStateFlow("Loading")
    val uiState: StateFlow<String> = _uiState

    fun initSocket() { println("Socket Initialized") }\n    fun loadDashboard(token: String) {
        viewModelScope.launch {
            try {
                val teams = repository.getTeams(token)
                _uiState.value = "Loaded ${teams.body()?.size ?: 0} Teams"
            } catch (e: Exception) {
                _uiState.value = "Error loading dashboard"
            }
        }
    }
}
