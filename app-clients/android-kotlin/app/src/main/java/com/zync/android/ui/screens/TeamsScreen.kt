package com.zync.android.ui.screens

import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.Composable

@Composable
fun TeamsScreen(teams: List<String>) {
    LazyColumn {
        items(teams) { team ->
            Card {
                Text(text = team, style = MaterialTheme.typography.titleMedium)
            }
        }
    }
}
