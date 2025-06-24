// src/redis/redis.module.ts
import { Global, Module, Provider } from '@nestjs/common';
import { createClient } from 'redis';
import { REDIS_CLIENT } from './redis.constants';

const redisProvider: Provider = {
  provide: REDIS_CLIENT,
  useFactory: async () => {
    const client = createClient({
      url: process.env.REDIS_URL ?? 'redis://localhost:6379',
    });
    await client.connect();
    return client;
  },
};

@Global() // O @Global() torna os provedores exportados disponíveis em toda a aplicação.
@Module({
  providers: [redisProvider],
  exports: [redisProvider], // Exporta o provedor para ser usado em outros módulos.
})
export class RedisModule {}
