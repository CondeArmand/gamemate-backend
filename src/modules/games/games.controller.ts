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
import { ResolveGameDto } from './dto/resolve-game.dto';

@Controller('games')
@UseInterceptors(CacheInterceptor) // Usa o interceptor de cache em todas as rotas deste controller
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  @Get('search')
  search(@Query('q') searchTerm: string) {
    return this.gamesService.searchGamesByName(searchTerm);
  }

  @Get('featured')
  @CacheKey('featured_games') // Chave de cache para esta rota
  @CacheTTL(60 * 60 * 24 * 7) // Cache para esta rota específica dura 1 hora (sobrescreve o default)
  getFeaturedGames() {
    return this.gamesService.getFeaturedGames();
  }

  @Get('resolve')
  resolveGame(@Query() resolveGameDto: ResolveGameDto) {
    return this.gamesService.resolveGame(resolveGameDto);
  }

  @Get(':id')
  @UseGuards(OptionalFirebaseAuthGuard)
  @CacheKey('game_details')
  @CacheTTL(60 * 5)
  getGameDetails(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ) {
    return this.gamesService.findGameDetails(id, user?.uid);
  }
}
