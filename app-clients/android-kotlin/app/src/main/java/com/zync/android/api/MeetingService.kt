package com.zync.android.api
import com.zync.android.models.Meeting
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Header
interface MeetingService {
    @GET("api/meet")
    suspend fun getMeetings(@Header("Authorization") token: String): Response<List<Meeting>>
}
