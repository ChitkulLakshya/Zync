package com.zync.android.api
import com.zync.android.models.Team
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Header
interface TeamService {
    @GET("api/teams")
    suspend fun getTeams(@Header("Authorization") token: String): Response<List<Team>>
}
