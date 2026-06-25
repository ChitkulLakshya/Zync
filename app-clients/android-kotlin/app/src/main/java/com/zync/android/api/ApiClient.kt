package com.zync.android.api
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
object ApiClient {
    private const val BASE_URL = "https://zync-meet.com/"
    val retrofit: Retrofit = Retrofit.Builder()
        .baseUrl(BASE_URL)
        .addConverterFactory(GsonConverterFactory.create())
        .build()
    
    val authService: AuthService = retrofit.create(AuthService::class.java)
    val teamService: TeamService = retrofit.create(TeamService::class.java)
    val projectService: ProjectService = retrofit.create(ProjectService::class.java)
    val meetingService: MeetingService = retrofit.create(MeetingService::class.java)
}
