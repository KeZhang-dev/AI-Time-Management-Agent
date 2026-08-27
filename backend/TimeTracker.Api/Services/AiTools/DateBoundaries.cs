namespace TimeTracker.Api.Services.AiTools;

/// <summary>
/// Day/week boundaries for the AI tools.
///
/// The app has no per-user timezone stored anywhere (no field on User, no
/// timezone header sent by the frontend) — the only existing timezone
/// convention is the Dashboard's reset countdown
/// (frontend/src/hooks/useMillisecondsUntilNextReset.ts), which uses the
/// browser's LOCAL midnight, not UTC. To stay consistent with that "local
/// wall-clock day" convention rather than silently switching to UTC, these
/// tools use the server's local time zone as the closest available
/// equivalent. This is a known simplification: in a real multi-timezone
/// deployment, the user's timezone would need to be stored and passed in
/// explicitly.
/// </summary>
internal static class DateBoundaries
{
    public static DateTimeOffset LocalMidnight(DateTimeOffset reference)
    {
        var localDate = reference.ToLocalTime().Date;
        var offset = TimeZoneInfo.Local.GetUtcOffset(localDate);
        return new DateTimeOffset(localDate, offset);
    }

    public static DateTimeOffset LocalMidnight(DateOnly date)
    {
        var localDate = date.ToDateTime(TimeOnly.MinValue);
        var offset = TimeZoneInfo.Local.GetUtcOffset(localDate);
        return new DateTimeOffset(localDate, offset);
    }

    public static DateTimeOffset TodayStart => LocalMidnight(DateTimeOffset.Now);

    public static DateTimeOffset StartOfWeek(DateTimeOffset reference)
    {
        var midnight = LocalMidnight(reference);
        var daysSinceMonday = ((int)midnight.DayOfWeek + 6) % 7; // Monday = 0 ... Sunday = 6
        return midnight.AddDays(-daysSinceMonday);
    }
}
