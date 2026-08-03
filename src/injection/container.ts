import { database } from './database';
import { repositories } from './repositories';
import { services } from './services';
import { controllers } from './controllers';
import { authMiddleware } from './middleware';
import { routes } from './routes';
import { Application } from 'express';

// Сборка единого класса вызова папки injection и передача её index - точка входа
export class Container {
    readonly database = database;
    readonly repositories = repositories;
    readonly services = services;
    readonly controllers = controllers;
    readonly middleware = { auth: authMiddleware};

    // Метод для подключения всех внешних ресурсов (БД, Планировщик и т.д.)
    async initialize(): Promise<void> {
        await this.database.connect();
        // Запуск сервиса метрик
        this.services.metricsScheduler.start();
        console.log('📦 Контейнер инициализирован [container.ts]');
    }

    // Метод для корректного завершения работы (shutdown)
    async dispose(): Promise<void> {
        await this.database.close();
        console.log('🧹 Контейнер очищен [container.ts]');
    }

    // Метод навешивания маршрутов
    routes(app:Application) {
        routes(app);
    }
}

export const container = new Container();


