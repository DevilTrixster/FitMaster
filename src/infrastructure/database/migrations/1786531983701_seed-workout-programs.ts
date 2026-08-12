import { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
    pgm.sql(`
        INSERT INTO workouts
            (id, name, description, frequency_per_week, is_active)
        VALUES
            (
                1,
                'Грудь / Плечи,
                'Базовая программа с акцентом на грудь, плечи и трицепс.',
                3,
                TRUE
            ),
            (
                2,
                'Спина / Бицепс / Трицепс'',
                'Базовая программа с акцентом на мышцы спины и бицепс.',
                3,
                TRUE
            ),
            (
                3,
                'Ноги / Пресс',
                'Базовая программа с акцентом на мышцы нижней части тела.',
                3,
                TRUE
            );
    `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
    pgm.sql(`
        DELETE FROM workouts
        WHERE id IN (1, 2, 3);
    `);
}
