// Define a estrutura do perfil que esperamos da Steam para ter tipagem forte
interface SteamProfile {
  id: string;
  displayName: string;
  photos: { value: string }[];
  provider: 'steam';
  _json: {
    steamid: string;
    personaname: string;
    avatarfull: string;
    // ... e outros campos que a Steam retorna
  };
}

// O truque acontece aqui. Estamos a dizer ao TypeScript:
// "No escopo do Express, aumente a interface Request para incluir a propriedade 'user'".
declare namespace Express {
  export interface Request {
    // A propriedade 'user' que o Passport anexa pode ser do tipo do nosso perfil Steam.
    // Usamos 'any' como fallback, mas o tipo específico é melhor.
    user?: SteamProfile;
  }
}
