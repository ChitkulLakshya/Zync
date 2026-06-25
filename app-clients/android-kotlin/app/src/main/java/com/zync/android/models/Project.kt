package com.zync.android.models
data class Project(val id: String, val title: String, val teamId: String, val columns: List<Column>)
data class Column(val id: String, val title: String, val order: Int)
data class Task(val id: String, val title: String, val columnId: String, val description: String)
