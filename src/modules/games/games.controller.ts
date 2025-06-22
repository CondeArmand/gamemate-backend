import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CacheInterceptor, CacheKey, CacheTTL } from '@nestjs/cache-manager'; // Para o cache!
import { GamesService } from './games.service';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../auth/decorators/current-user.decorator';
import { OptionalFirebaseAuthGuard } from '../auth/guards/optional-firebase-auth.guard';

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

  @Get('details/igdb/:igdbId')
  // Este endpoint pode ser opcionalmente autenticado se quisermos saber se o usuário já o possui
  @UseGuards(OptionalFirebaseAuthGuard)
  getAndEnrichGameByIgdbId(
    @Param('igdbId') igdbId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ) {
    // Aqui chamaríamos o nosso GameEnrichmentService (a ser criado/usado)
    // Ex: return this.gameEnrichmentService.enrichByIgdbId(igdbId, user?.uid);
    // Este serviço conteria a lógica de buscar na IGDB, tentar encontrar o steamId,
    // e chamar o gameRepository.smartUpsert.

    // Por agora, vamos simular o retorno
    return {
      message: `Lógica para enriquecer e retornar o jogo com IGDB ID: ${igdbId}`,
    };
  }
}
