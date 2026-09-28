import type { LegalPagePath } from './content';

export const legalPagesIt: Record<LegalPagePath, {
  pageTitle: string;
  description: string;
  eyebrow: string;
  title: string;
  lead: string;
  sections: readonly { title: string; paragraphs: readonly string[] }[];
}> = {
  '/privacy': {
    pageTitle: 'Informativa sulla privacy',
    description: 'Come Ushly tratta dati dell’account, link brevi, statistiche, indirizzi IP pseudonimizzati, autenticazione e richieste sulla privacy.',
    eyebrow: 'Privacy',
    title: 'Informativa sulla privacy',
    lead: 'Questa informativa descrive i dati utilizzati dal progetto Ushly e le tutele integrate nelle funzioni per link e account.',
    sections: [
      { title: 'Titolare del trattamento', paragraphs: ['Il gestore del servizio è {{legalName}}. Le richieste relative a privacy e cancellazione devono essere inviate a {{contactEmail}}. Questi dati configurabili devono essere sostituiti con informazioni verificate prima della pubblicazione.'] },
      { title: 'Account e autenticazione', paragraphs: ['Gli account locali usano un indirizzo email e un hash unidirezionale della password. I token di accesso restano nella memoria del browser. Il token di aggiornamento ruota ed è conservato in un cookie HttpOnly limitato ai percorsi di autenticazione e, nel database, soltanto come hash.', 'Se scegli l’accesso con Google o colleghi esplicitamente Google, Ushly riceve l’identificativo e l’email necessari a riconoscere l’account. Gli account non vengono uniti automaticamente soltanto perché hanno la stessa email.'] },
      { title: 'Link brevi e reindirizzamenti', paragraphs: ['Ushly conserva URL di destinazione, codice breve, titolo e scadenza facoltativi, stato e proprietario quando il link è creato da un utente autenticato. I link anonimi non sono associati a un account.', 'Le destinazioni sono accessibili tramite il relativo link breve. Non inserire segreti o valori sensibili nella query di un URL che intendi condividere.'] },
      { title: 'Statistiche e minimizzazione dei dati', paragraphs: ['Durante un reindirizzamento Ushly registra un HMAC unidirezionale dell’indirizzo IP, non l’indirizzo in chiaro. Può inoltre conservare uno user agent limitato a 256 caratteri e l’origine del referrer, senza percorso o query, anch’essa limitata a 256 caratteri. Non è attivo alcun servizio di geolocalizzazione.', 'Le statistiche sono disponibili soltanto al proprietario autenticato. La conservazione configurata è di 90 giorni per impostazione predefinita. La cancellazione pianificata automatica richiede ancora una procedura operativa prima della pubblicazione.'] },
      { title: 'Richieste di accesso e cancellazione', paragraphs: ['Usa l’indirizzo di contatto configurato per chiedere accesso, correzione o cancellazione. Il gestore deve verificare il richiedente e definire le procedure applicabili. Al momento non è disponibile un modulo pubblico self-service.'] },
      { title: 'Strumenti futuri', paragraphs: ['Ushly non carica attualmente strumenti facoltativi di analisi del pubblico o pubblicità. Se saranno introdotti, informativa e controlli del consenso dovranno essere aggiornati prima dell’attivazione.'] },
    ],
  },
  '/cookies': {
    pageTitle: 'Informativa sui cookie',
    description: 'Come Ushly usa cookie essenziali di autenticazione e conserva le preferenze senza caricare strumenti facoltativi di tracciamento.',
    eyebrow: 'Cookie',
    title: 'Informativa sui cookie',
    lead: 'Le funzioni essenziali di sessione funzionano senza consenso facoltativo. Ushly non carica attualmente strumenti di analisi o pubblicità opzionali.',
    sections: [
      { title: 'Cookie essenziali di autenticazione', paragraphs: ['Dopo l’autenticazione Ushly usa un cookie con token di aggiornamento a rotazione per ripristinare e terminare la sessione. È HttpOnly, limitato ai percorsi di autenticazione e Secure in produzione. SameSite e durata dipendono dalla configurazione del gestore.', 'Google OAuth usa cookie HttpOnly di breve durata per proteggere accesso e collegamento esplicito dell’account. Sono necessari soltanto quando viene usato quel flusso.'] },
      { title: 'Memorizzazione delle preferenze', paragraphs: ['La scelta Accetta tutti, Rifiuta i non essenziali o personalizzata viene salvata nel local storage del browser. Non è un cookie di autenticazione e non contiene token, password o dati del provider.'] },
      { title: 'Analisi e pubblicità facoltative', paragraphs: ['Non è implementato alcun fornitore facoltativo di analisi o pubblicità. Accettare queste categorie oggi non carica strumenti né crea cookie opzionali. Ushly dovrà identificare ogni futuro fornitore e aggiornare queste pagine prima di abilitarlo.'] },
      { title: 'Modifica della scelta', paragraphs: ['Puoi usare Impostazioni cookie nel footer in qualsiasi momento. Rifiutare le categorie facoltative non disabilita abbreviazione URL, reindirizzamenti, autenticazione o cookie essenziali di sessione.'] },
    ],
  },
  '/terms': {
    pageTitle: 'Termini di servizio',
    description: 'Termini modello per l’uso di link brevi, codici QR, account, controlli dei link e statistiche riservate al proprietario.',
    eyebrow: 'Note legali',
    title: 'Termini di servizio',
    lead: 'Questi termini modello descrivono il progetto Ushly e richiedono revisione legale e dati verificati del gestore prima della pubblicazione.',
    sections: [
      { title: 'Gestore e stato del servizio', paragraphs: ['Il gestore del servizio è {{legalName}}, contattabile a {{contactEmail}}. Sono valori configurabili e questo documento è un modello di progetto, non una consulenza legale pronta per la produzione.'] },
      { title: 'Cosa offre Ushly', paragraphs: ['Ushly crea link brevi per destinazioni HTTP e HTTPS, genera codici QR, registra statistiche attente alla privacy e consente ai proprietari autenticati di gestire scadenza e stato.', 'Questo modello di progetto non garantisce disponibilità continua, conservazione permanente o reindirizzamenti senza interruzioni.'] },
      { title: 'Le tue responsabilità', paragraphs: ['Sei responsabile delle destinazioni e dei contenuti condivisi, della protezione delle credenziali e delle autorizzazioni necessarie. Non usare Ushly per attività illegali, ingannevoli, abusive o dannose.'] },
      { title: 'Link, codici QR e statistiche', paragraphs: ['Un codice QR contiene il link breve pubblico Ushly e non traccia autonomamente le scansioni. Le statistiche appartengono al link e sono riservate al proprietario autenticato. Link disattivati, eliminati o scaduti non reindirizzano.'] },
      { title: 'Account e cessazione', paragraphs: ['Il gestore può limitare l’accesso per proteggere il servizio o rispondere ad abusi. Finché non sarà disponibile una procedura self-service, cancellazione dell’account e richieste sui dati devono passare dal contatto configurato.'] },
      { title: 'Modifiche prima della pubblicazione', paragraphs: ['Il gestore deve verificare la normativa applicabile, aggiungere date di efficacia e termini relativi alla giurisdizione, confermare i contatti e aggiornare il modello quando cambiano servizio o trattamento dei dati.'] },
    ],
  },
};
