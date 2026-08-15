analyze the notes section the share feature is not working.
do not edit any chnages just analyze the code and tell why the feature is not working

1. The Email Invitation is Stubbed Out (Incomplete)
In 

ShareDialog.tsx
, the handleInvite function (which triggers when clicking the "Invite" button) only displays an informational toast stating that the email invitation feature is coming soon:

const handleInvite = async () => {
    if (!email) {return;}
    setLoading(true);
    try {
        toast.info("Invite by email coming soon! Please share the link.");
    } catch (e: any) {
        toast.error("Failed to invite user");
    } finally {
        setLoading(false);
    }
};
No actual backend call or DB write occurs when inviting someone by email.

2. Missing User Identity Lookup / Mapping
The permissions store maps user IDs (uid) to roles (viewer, editor, owner). The dialog asks for the colleague's email but does not resolve that email to a corresponding uid in order to update the permissions dictionary correctly.

Based on the analysis of 

PeopleView.tsx
, the activity status bug is caused by the following logic in lines 930–950:

let statusText = status;
if (lastSeenDate && !isNaN(lastSeenDate.getTime())) {
  try {
    const duration = formatDistanceToNow(lastSeenDate, { addSuffix: false })
      .replace('less than a minute', '1m')
      .replace(' minutes', 'm')
      .replace(' minute', 'm')
      .replace(' hours', 'h')
      .replace(' hour', 'h')
      .replace(' days', 'd')
      .replace(' day', 'd');

    if (status === 'online') {
      statusText = `Online (${duration})`;
    } else {
      statusText = `Offline ${duration}`;
    }
  } catch (e) {
  }
}
Why the Activity Status is Showing Wrong:
Away status is shown as Offline: The status property can be 'online' | 'offline' | 'away'. If a user is away, the code falls into the else block because status !== 'online'. Consequently, an active but idle user who should show as Away is incorrectly labeled as Offline.
Confusing Online durations: When a user is actively online, showing a duration since their last heartbeat (e.g., Online (2h)) is confusing because it makes the active status seem stale or contradictory.
Dirty duration strings: The string replacement on the output of formatDistanceToNow only replaces specific strings (like ' hours') but leaves prefixes like 'about ', 'over ', or 'almost ' intact (e.g., showing as Offline about 2h or Online (almost 15m)).
How to Solve It:
You can fix the conditional blocks to handle the three states properly (online, away, and offline), and optionally clean up the duration prefix.

Update the logic in 

PeopleView.tsx
 to:

typescript
let statusText = status;
if (lastSeenDate && !isNaN(lastSeenDate.getTime())) {
  try {
    const duration = formatDistanceToNow(lastSeenDate, { addSuffix: false })
      .replace(/^(about|over|almost)\s+/, '') // Strip prefixes like "about", "over", etc.
      .replace('less than a minute', '1m')
      .replace(' minutes', 'm')
      .replace(' minute', 'm')
      .replace(' hours', 'h')
      .replace(' hour', 'h')
      .replace(' days', 'd')
      .replace(' day', 'd');
    if (status === 'online') {
      statusText = 'Online'; // Keep it clean for currently active users
    } else if (status === 'away') {
      statusText = `Away (${duration})`; // Correctly handle the away state
    } else {
      statusText = `Offline ${duration}`; // Only display Offline when they are actually offline
    }
  } catch (e) {
    // Fallback if parsing fails
  }
}