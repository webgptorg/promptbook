import moment from 'moment';
import 'moment/locale/cs';
import type { ServerLanguageCode } from '../../languages/ServerLanguageRegistry';

/**
 * Creates one locale-aware moment instance for the active Agents Server language.
 */
export function createServerLanguageMoment(value: moment.MomentInput, language: ServerLanguageCode): moment.Moment {
    return moment(value).locale(language);
}
