package site.sorbits.life;

import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;

/**
 * Cortes de día en la zona horaria de la app (p. ej. America/Mexico_City).
 * Alineado con {@link LifeDeadlineScheduler} y notificaciones.
 */
public record LifeDayBounds(
        ZoneId zone,
        Instant now,
        Instant startOfToday,
        Instant startOfTomorrow,
        Instant endOfSoonWindow,
        Instant endOfUpcomingWindow) {

    /** Días después de mañana incluidos en “Próximos días” (Hoy). */
    public static final int SOON_DAYS = 3;

    /** Días después de mañana incluidos en filtro “Próximas” (Tareas). */
    public static final int UPCOMING_DAYS = 7;

    public static LifeDayBounds at(ZoneId zone, Instant now) {
        ZonedDateTime znow = now.atZone(zone);
        Instant startOfToday = znow.toLocalDate().atStartOfDay(zone).toInstant();
        Instant startOfTomorrow = znow.toLocalDate().plusDays(1).atStartOfDay(zone).toInstant();
        Instant endOfSoonWindow =
                znow.toLocalDate().plusDays(1L + SOON_DAYS).atStartOfDay(zone).toInstant();
        Instant endOfUpcomingWindow =
                znow.toLocalDate().plusDays(1L + UPCOMING_DAYS).atStartOfDay(zone).toInstant();
        return new LifeDayBounds(
                zone, now, startOfToday, startOfTomorrow, endOfSoonWindow, endOfUpcomingWindow);
    }

    /**
     * Clasifica una tarea abierta con {@code dueAt}.
     * Vencida = instante estrictamente anterior a {@code now} (no solo día calendario).
     */
    public LifeDueBucket bucket(Instant dueAt) {
        if (dueAt == null) {
            return LifeDueBucket.NONE;
        }
        if (dueAt.isBefore(now)) {
            return LifeDueBucket.OVERDUE;
        }
        if (dueAt.isBefore(startOfTomorrow)) {
            return LifeDueBucket.TODAY;
        }
        if (dueAt.isBefore(endOfSoonWindow)) {
            return LifeDueBucket.SOON;
        }
        return LifeDueBucket.LATER;
    }

    public boolean isOverdue(Instant dueAt) {
        return bucket(dueAt) == LifeDueBucket.OVERDUE;
    }

    public boolean isDueToday(Instant dueAt) {
        return bucket(dueAt) == LifeDueBucket.TODAY;
    }

    public boolean isDueSoon(Instant dueAt) {
        return bucket(dueAt) == LifeDueBucket.SOON;
    }

    public boolean isUpcoming(Instant dueAt) {
        LifeDueBucket b = bucket(dueAt);
        return b == LifeDueBucket.SOON || (b == LifeDueBucket.LATER && dueAt.isBefore(endOfUpcomingWindow));
    }
}
