package site.sorbits.life;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class LifeDayBoundsTest {

    private static final ZoneId MX = ZoneId.of("America/Mexico_City");

    @Test
    void taskDueEarlierTodayIsOverdueNotToday() {
        LocalDate day = LocalDate.of(2026, 6, 16);
        Instant now = day.atTime(14, 0).atZone(MX).toInstant();
        Instant dueAt = day.atTime(10, 0).atZone(MX).toInstant();
        LifeDayBounds bounds = LifeDayBounds.at(MX, now);

        assertEquals(LifeDueBucket.OVERDUE, bounds.bucket(dueAt));
        assertTrue(bounds.isOverdue(dueAt));
        assertFalse(bounds.isDueToday(dueAt));
    }

    @Test
    void taskDueLaterTodayIsTodayNotOverdue() {
        LocalDate day = LocalDate.of(2026, 6, 16);
        Instant now = day.atTime(10, 0).atZone(MX).toInstant();
        Instant dueAt = day.atTime(18, 30).atZone(MX).toInstant();
        LifeDayBounds bounds = LifeDayBounds.at(MX, now);

        assertEquals(LifeDueBucket.TODAY, bounds.bucket(dueAt));
        assertFalse(bounds.isOverdue(dueAt));
        assertTrue(bounds.isDueToday(dueAt));
    }

    @Test
    void yesterdayIsOverdue() {
        LocalDate day = LocalDate.of(2026, 6, 16);
        Instant now = day.atTime(10, 0).atZone(MX).toInstant();
        Instant dueAt = day.minusDays(1).atTime(23, 0).atZone(MX).toInstant();
        LifeDayBounds bounds = LifeDayBounds.at(MX, now);

        assertEquals(LifeDueBucket.OVERDUE, bounds.bucket(dueAt));
    }

    @Test
    void tomorrowIsSoon() {
        LocalDate day = LocalDate.of(2026, 6, 16);
        Instant now = day.atTime(10, 0).atZone(MX).toInstant();
        Instant dueAt = day.plusDays(1).atTime(9, 0).atZone(MX).toInstant();
        LifeDayBounds bounds = LifeDayBounds.at(MX, now);

        assertEquals(LifeDueBucket.SOON, bounds.bucket(dueAt));
    }

    @Test
    void usesLocalMidnightNotUtc() {
        // 23:30 en México el 15-jun → en UTC ya es 16-jun, pero “hoy” debe ser 15-jun en MX
        LocalDate day = LocalDate.of(2026, 6, 15);
        Instant now = day.atTime(23, 30).atZone(MX).toInstant();
        Instant dueAt = day.atTime(23, 45).atZone(MX).toInstant();
        LifeDayBounds bounds = LifeDayBounds.at(MX, now);

        assertEquals(LifeDueBucket.TODAY, bounds.bucket(dueAt));
    }
}
