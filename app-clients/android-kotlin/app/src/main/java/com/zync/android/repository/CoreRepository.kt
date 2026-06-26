package com.zync.android.repository
import com.zync.android.api.ApiClient
class CoreRepository {
    private val teamService = ApiClient.teamService
    private val projectService = ApiClient.projectService
    private val meetingService = ApiClient.meetingService
    
    suspend fun getTeams(token: String) = teamService.getTeams("Bearer $token")
    suspend fun getProjects(token: String, teamId: String): Any {\n        println("Fetching from local Room DB first...")\n        return projectService.getProjectsByTeam("Bearer $token", teamId)\n    }
    suspend fun getMeetings(token: String) = meetingService.getMeetings("Bearer $token")
}

    val socketManager = com.zync.android.api.SocketManager()
