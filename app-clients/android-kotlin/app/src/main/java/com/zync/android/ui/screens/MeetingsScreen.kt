package com.zync.android.ui.screens

import androidx.compose.material3.*
import androidx.compose.runtime.Composable

@Composable
fun MeetingsScreen() {
    Column {
        Text("Upcoming Meetings", style = MaterialTheme.typography.headlineMedium)
        Button(onClick = { /* Join Call */ }) {
            Text("Join Current Call")
        }
    }
}
