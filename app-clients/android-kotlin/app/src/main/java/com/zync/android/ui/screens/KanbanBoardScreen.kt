package com.zync.android.ui.screens

import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.*
import androidx.compose.runtime.Composable

@Composable
fun KanbanBoardScreen(columns: List<String>) {
    LazyRow {
        items(columns.size) { index ->
            Surface(color = MaterialTheme.colorScheme.surfaceVariant) {
                Text(columns[index])
                // Nested LazyColumn for tasks goes here
            }
        }
    }
}
