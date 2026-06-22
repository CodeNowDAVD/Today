package site.sorbits.life;

/**
 * Clasificación mutuamente excluyente de tareas abiertas con fecha límite.
 * Una sola fuente de verdad para Hoy, Tareas y etiquetas de estado.
 */
public enum LifeDueBucket {
    /** Fecha límite ya pasó (instante &lt; ahora). */
    OVERDUE,
    /** Aún hoy en la zona del usuario y no vencida. */
    TODAY,
    /** Desde mañana hasta el fin de la ventana “próximos” (3 días en Hoy). */
    SOON,
    /** Con fecha pero fuera de las ventanas anteriores. */
    LATER,
    /** Sin fecha límite. */
    NONE
}
