package com.zync.android.db
interface MeetingDao {
    fun getUpcomingMeetings(): List<String>
}
