import { Controller, Get, Query, UseInterceptors } from '@nestjs/common';
import { CacheInterceptor, CacheKey, CacheTTL } from '@nestjs/cache-manager'; // Para o cache!
import { GamesService } from './games.service';

@Controller('games')
@UseInterceptors(CacheInterceptor) // Usa o interceptor de cache em todas as rotas deste controller
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  @Get('search')
  @CacheKey('search_games') // Chave de cache para esta rota
  @CacheTTL(60 * 60) // Cache para esta rota específica dura 1 hora (sobrescreve o default)
  search(@Query('q') searchTerm: string) {
    return this.gamesService.searchGamesByName(searchTerm);
  }

  @Get('featured')
  @CacheKey('featured_games') // Chave de cache para esta rota
  @CacheTTL(60 * 60 * 24 * 7) // Cache para esta rota específica dura 1 hora (sobrescreve o default)
  getFeaturedGames() {
    return this.gamesService.getFeaturedGames();
  }
}
