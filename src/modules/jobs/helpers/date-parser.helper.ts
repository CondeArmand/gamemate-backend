import { parse, isValid } from 'date-fns';
import { enUS } from 'date-fns/locale'; // Importa o locale para nomes de meses em inglês

/**
 * Tenta converter uma string de data da Steam para um objeto Date válido.
 * Lida com vários formatos comuns retornados pela API.
 * @param steamDateString A string da data vinda da API da Steam (ex: "18 May, 2015").
 * @returns Um objeto Date válido ou null se o parsing falhar.
 */
export function parseSteamDate(steamDateString: string): Date | null {
  // Se a string for vazia ou contiver texto não relacionado a data, retorna null
  if (!steamDateString || /(coming soon|tba)/i.test(steamDateString)) {
    return null;
  }

  // Lista de formatos que vamos tentar, em ordem de especificidade
  const dateFormats = [
    'd MMM, yyyy', // Ex: "18 May, 2015"
    'MMM d, yyyy', // Ex: "May 18, 2015"
    'MMMM d, yyyy', // Ex: "May 18, 2015"
    'MMM yyyy', // Ex: "Nov 2014"
    'MMMM yyyy', // Ex: "November 2014"
  ];

  // Tenta cada formato
  for (const format of dateFormats) {
    const parsedDate = parse(steamDateString, format, new Date(), {
      locale: enUS,
    });
    if (isValid(parsedDate)) {
      return parsedDate; // Retorna a primeira conversão bem-sucedida
    }
  }

  // Se nenhum formato customizado funcionar, tenta o construtor nativo como último recurso
  const nativeParsedDate = new Date(steamDateString);
  if (isValid(nativeParsedDate)) {
    return nativeParsedDate;
  }

  // Se nada funcionar, retorna null
  return null;
}
