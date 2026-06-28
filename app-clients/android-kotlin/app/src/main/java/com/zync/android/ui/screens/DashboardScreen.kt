package com.zync.android.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier

@Composable
fun DashboardScreen() {
    Scaffold(
        bottomBar = {
            NavigationBar {
                NavigationBarItem(selected = true, onClick = {}, icon = { Text("Teams") })
                NavigationBarItem(selected = false, onClick = {}, icon = { Text("Kanban") })
                NavigationBarItem(selected = false, onClick = {}, icon = { Text("Meet") })
            }
        }
    ) { padding ->
        Box(modifier = Modifier.padding(padding).fillMaxSize()) {
            Text("Welcome to Zync Native!")
        }
    }
}
