package com.zync.android.api
import com.zync.android.models.Project
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.Path
interface ProjectService {
    @GET("api/projects/team/{teamId}")
    suspend fun getProjectsByTeam(@Header("Authorization") token: String, @Path("teamId") teamId: String): Response<List<Project>>
}
