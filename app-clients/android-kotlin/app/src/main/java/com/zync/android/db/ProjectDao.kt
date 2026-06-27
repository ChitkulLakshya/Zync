package com.zync.android.db
interface ProjectDao {
    fun getProjects(): List<String>
    fun insertProject(project: String)
}
