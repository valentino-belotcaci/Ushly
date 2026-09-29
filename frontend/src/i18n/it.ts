import type { EnglishTranslation } from './en.ts';

const legalPages = {
  '/privacy': {
    pageTitle: 'Informativa sulla privacy',
    description:
      'Come Ushly tratta dati dell’account, link brevi, statistiche, indirizzi IP pseudonimizzati, autenticazione e richieste sulla privacy.',
    eyebrow: 'Privacy',
    title: 'Informativa sulla privacy',
    lead: 'Questa informativa descrive i dati utilizzati dal progetto Ushly e le tutele integrate nelle funzioni per link e account.',
    sections: [
      {
        title: 'Titolare del trattamento',
        paragraphs: [
          'Il gestore del servizio è {{legalName}}. Le richieste relative a privacy e cancellazione devono essere inviate a {{contactEmail}}. Questi dati configurabili devono essere sostituiti con informazioni verificate prima della pubblicazione.',
        ],
      },
      {
        title: 'Account e autenticazione',
        paragraphs: [
          'Gli account locali usano un indirizzo email e un hash unidirezionale della password. I token di accesso restano nella memoria del browser. Il token di aggiornamento ruota ed è conservato in un cookie HttpOnly limitato ai percorsi di autenticazione e, nel database, soltanto come hash.',
          'Se scegli l’accesso con Google o colleghi esplicitamente Google, Ushly riceve l’identificativo e l’email necessari a riconoscere l’account. Gli account non vengono uniti automaticamente soltanto perché hanno la stessa email.',
        ],
      },
      {
        title: 'Link brevi e reindirizzamenti',
        paragraphs: [
          'Ushly conserva URL di destinazione, codice breve, titolo e scadenza facoltativi, stato e proprietario quando il link è creato da un utente autenticato. I link anonimi non sono associati a un account.',
          'Le destinazioni sono accessibili tramite il relativo link breve. Non inserire segreti o valori sensibili nella query di un URL che intendi condividere.',
        ],
      },
      {
        title: 'Statistiche e minimizzazione dei dati',
        paragraphs: [
          'Durante un reindirizzamento Ushly registra un HMAC unidirezionale dell’indirizzo IP, non l’indirizzo in chiaro. Può inoltre conservare uno user agent limitato a 256 caratteri e l’origine del referrer, senza percorso o query, anch’essa limitata a 256 caratteri. Non è attivo alcun servizio di geolocalizzazione.',
          'Le statistiche sono disponibili soltanto al proprietario autenticato. La conservazione configurata è di 90 giorni per impostazione predefinita. La cancellazione pianificata automatica richiede ancora una procedura operativa prima della pubblicazione.',
        ],
      },
      {
        title: 'Richieste di accesso e cancellazione',
        paragraphs: [
          'Usa l’indirizzo di contatto configurato per chiedere accesso, correzione o cancellazione. Il gestore deve verificare il richiedente e definire le procedure applicabili. Al momento non è disponibile un modulo pubblico self-service.',
        ],
      },
      {
        title: 'Strumenti futuri',
        paragraphs: [
          'Ushly non carica attualmente strumenti facoltativi di analisi del pubblico o pubblicità. Se saranno introdotti, informativa e controlli del consenso dovranno essere aggiornati prima dell’attivazione.',
        ],
      },
    ],
  },
  '/cookies': {
    pageTitle: 'Informativa sui cookie',
    description:
      'Come Ushly usa cookie essenziali di autenticazione e conserva le preferenze senza caricare strumenti facoltativi di tracciamento.',
    eyebrow: 'Cookie',
    title: 'Informativa sui cookie',
    lead: 'Le funzioni essenziali di sessione funzionano senza consenso facoltativo. Ushly non carica attualmente strumenti di analisi o pubblicità opzionali.',
    sections: [
      {
        title: 'Cookie essenziali di autenticazione',
        paragraphs: [
          'Dopo l’autenticazione Ushly usa un cookie con token di aggiornamento a rotazione per ripristinare e terminare la sessione. È HttpOnly, limitato ai percorsi di autenticazione e Secure in produzione. SameSite e durata dipendono dalla configurazione del gestore.',
          'Google OAuth usa cookie HttpOnly di breve durata per proteggere accesso e collegamento esplicito dell’account. Sono necessari soltanto quando viene usato quel flusso.',
        ],
      },
      {
        title: 'Memorizzazione delle preferenze',
        paragraphs: [
          'La scelta Accetta tutti, Rifiuta i non essenziali o personalizzata viene salvata nel local storage del browser. Non è un cookie di autenticazione e non contiene token, password o dati del provider.',
        ],
      },
      {
        title: 'Analisi e pubblicità facoltative',
        paragraphs: [
          'Non è implementato alcun fornitore facoltativo di analisi o pubblicità. Accettare queste categorie oggi non carica strumenti né crea cookie opzionali. Ushly dovrà identificare ogni futuro fornitore e aggiornare queste pagine prima di abilitarlo.',
        ],
      },
      {
        title: 'Modifica della scelta',
        paragraphs: [
          'Puoi usare Impostazioni cookie nel footer in qualsiasi momento. Rifiutare le categorie facoltative non disabilita abbreviazione URL, reindirizzamenti, autenticazione o cookie essenziali di sessione.',
        ],
      },
    ],
  },
  '/terms': {
    pageTitle: 'Termini di servizio',
    description:
      'Termini modello per l’uso di link brevi, codici QR, account, controlli dei link e statistiche riservate al proprietario.',
    eyebrow: 'Note legali',
    title: 'Termini di servizio',
    lead: 'Questi termini modello descrivono il progetto Ushly e richiedono revisione legale e dati verificati del gestore prima della pubblicazione.',
    sections: [
      {
        title: 'Gestore e stato del servizio',
        paragraphs: [
          'Il gestore del servizio è {{legalName}}, contattabile a {{contactEmail}}. Sono valori configurabili e questo documento è un modello di progetto, non una consulenza legale pronta per la produzione.',
        ],
      },
      {
        title: 'Cosa offre Ushly',
        paragraphs: [
          'Ushly crea link brevi per destinazioni HTTP e HTTPS, genera codici QR, registra statistiche attente alla privacy e consente ai proprietari autenticati di gestire scadenza e stato.',
          'Questo modello di progetto non garantisce disponibilità continua, conservazione permanente o reindirizzamenti senza interruzioni.',
        ],
      },
      {
        title: 'Le tue responsabilità',
        paragraphs: [
          'Sei responsabile delle destinazioni e dei contenuti condivisi, della protezione delle credenziali e delle autorizzazioni necessarie. Non usare Ushly per attività illegali, ingannevoli, abusive o dannose.',
        ],
      },
      {
        title: 'Link, codici QR e statistiche',
        paragraphs: [
          'Un codice QR contiene il link breve pubblico Ushly e non traccia autonomamente le scansioni. Le statistiche appartengono al link e sono riservate al proprietario autenticato. Link disattivati, eliminati o scaduti non reindirizzano.',
        ],
      },
      {
        title: 'Account e cessazione',
        paragraphs: [
          'Il gestore può limitare l’accesso per proteggere il servizio o rispondere ad abusi. Finché non sarà disponibile una procedura self-service, cancellazione dell’account e richieste sui dati devono passare dal contatto configurato.',
        ],
      },
      {
        title: 'Modifiche prima della pubblicazione',
        paragraphs: [
          'Il gestore deve verificare la normativa applicabile, aggiungere date di efficacia e termini relativi alla giurisdizione, confermare i contatti e aggiornare il modello quando cambiano servizio o trattamento dei dati.',
        ],
      },
    ],
  },
};

export const it = {
  locale: 'it',
  languageName: 'Italiano',
  layout: {
    skip: 'Vai al contenuto',
    home: 'Home di Ushly',
    primary: 'Navigazione principale',
    menu: 'Menu',
    closeMenu: 'Chiudi menu',
    nav: ['Abbrevia URL', 'Codici QR', 'Statistiche', 'Funzionalità'],
    login: 'Accedi',
    getStarted: 'Inizia gratis',
    product: 'Prodotto',
    resources: 'Risorse',
    legal: 'Note legali',
    account: 'Account',
    contact: 'Contatti',
    privacy: 'Informativa sulla privacy',
    cookies: 'Informativa sui cookie',
    terms: 'Termini di servizio',
    cookieSettings: 'Impostazioni cookie',
    footerDescription:
      'Link brevi, codici QR e statistiche riservate al proprietario.',
    copyright: '© 2026 Ushly. Tutti i diritti riservati.',
    language: 'Lingua',
    selectLanguage: 'Seleziona la lingua',
    lightTheme: 'Usa il tema chiaro',
    darkTheme: 'Usa il tema scuro',
    logout: 'Esci',
    loggedOut: 'Hai effettuato la disconnessione.',
    logoutWarning:
      'La sessione locale è terminata, ma il server non ha confermato la disconnessione. Riprova quando sei online.',
  },
  common: {
    loading: 'Caricamento',
    retry: 'Riprova',
    previous: 'Precedente',
    next: 'Successiva',
    pagination: 'Paginazione',
    page: 'Pagina',
    of: 'di',
    results: 'risultati',
    cancel: 'Annulla',
    confirm: 'Conferma',
    closeDialog: 'Chiudi finestra',
    notifications: 'Notifiche',
    dismissNotification: 'Chiudi notifica',
    unknownError: 'Si è verificato un problema. Riprova.',
    noClicks: 'Nessun clic',
    never: 'Mai',
    anonymous: 'Anonimo',
    account: 'Account',
    authenticatedUser: 'Utente autenticato',
    active: 'Attivo',
    disabled: 'Disattivato',
    expired: 'Scaduto',
    enabled: 'Attivo',
    enable: 'Attiva',
    disable: 'Disattiva',
    edit: 'Modifica',
    delete: 'Elimina',
    copy: 'Copia',
    copied: 'Copiato',
    visit: 'Visita',
    download: 'Scarica',
    actions: 'Azioni',
    status: 'Stato',
    expiration: 'Scadenza',
    link: 'Link',
    owner: 'Proprietario',
    created: 'Creato',
    rowsPerPage: 'Righe per pagina',
    untitledLink: 'Link senza titolo',
    unavailable: 'Pagina non disponibile',
    unavailableText:
      'Questa pagina non è ancora disponibile. Le altre pagine pubbliche e funzioni account di Ushly arriveranno nei prossimi aggiornamenti.',
    returnUshly: 'Torna a Ushly',
    componentLibrary: 'Esplora la libreria dei componenti',
  },
  auth: {
    welcome: 'Benvenuto su Ushly',
    loginTitle: 'Accedi a Ushly',
    registerTitle: 'Crea un account',
    loginIntro: 'Accedi al tuo account per continuare a gestire i link.',
    registerIntro:
      'Crea un account per gestire i link e consultarne le statistiche.',
    signedIn: 'Accesso effettuato.',
    sessionReady: 'La sessione è pronta.',
    openDashboard: 'Apri la dashboard',
    continueGoogle: 'Continua con Google',
    googlePending:
      'Completa l’accesso nella finestra Google. Questa pagina si aggiornerà automaticamente.',
    cancelGoogle: 'Annulla accesso con Google',
    or: 'oppure',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Conferma password',
    createAccount: 'Crea account',
    login: 'Accedi',
    already: 'Hai già un account?',
    new: 'Non hai ancora un account?',
    legalPrefix: 'Creando un account accetti la nostra',
    and: 'e i',
    javascript:
      'Abilita JavaScript per inviare le credenziali in sicurezza senza inserirle nell’URL.',
    validEmail: 'Inserisci un indirizzo email valido.',
    passwordLength: 'Usa una password tra 8 e 128 caratteri.',
    enterPassword: 'Inserisci la password.',
    passwordMismatch: 'Le password non coincidono.',
    accountReady: 'Il tuo account è pronto.',
    googleNotConfigured:
      'L’accesso con Google non è ancora configurato. Riprova più tardi.',
    popupBlocked: 'Consenti l’apertura della finestra Google e riprova.',
    googleClosed:
      'La finestra Google è stata chiusa prima del completamento. Riprova.',
    googleTimeout: 'L’accesso con Google è scaduto. Riprova.',
    googleFailed: 'Impossibile completare l’accesso con Google. Riprova.',
    linkGoogle: 'Collega account Google',
    linkTitle: 'Collega Google al tuo account',
    linkDescription:
      'Per gli account con password, conferma la password attuale prima di collegare un’identità Google. Gli account non vengono mai uniti soltanto in base all’email.',
    currentPassword: 'Password attuale',
    verifyLink: 'Verifica e collega Google',
    cancelLink: 'Annulla collegamento Google',
    linkSuccess: 'Account Google collegato.',
    linkClosed:
      'La finestra Google è stata chiusa prima del completamento. Riprova.',
    linkTimeout: 'Il collegamento con Google è scaduto. Riprova.',
    linkConflict:
      'Questa identità Google è già collegata a un altro account. Nessun account è stato unito.',
    linkFailed: 'Impossibile completare il collegamento con Google. Riprova.',
    linkConfirmFailed:
      'Impossibile confermare il collegamento con Google. Accedi e riprova.',
    linkNotConfigured:
      'Il collegamento con Google non è ancora configurato. Riprova più tardi.',
    linkPassword: 'Inserisci la password dell’account per collegare Google.',
    linkPopup: 'Consenti l’apertura della finestra Google e riprova.',
    linkStartFailed: 'Impossibile avviare il collegamento con Google. Riprova.',
    linkPending:
      'Completa il collegamento nella finestra Google. Questa pagina si aggiornerà automaticamente.',
    conflict:
      'Questa identità Google potrebbe appartenere a un account esistente. Accedi con il metodo già usato, apri Impostazioni nella dashboard, scegli Collega account Google e verifica la password. Gli account non vengono mai uniti soltanto in base all’email.',
  },
  dashboard: {
    skip: 'Vai al contenuto della dashboard',
    label: 'Dashboard',
    navigation: 'Navigazione dashboard',
    restoring: 'Ripristino della sessione…',
    closeMenu: 'Chiudi menu dashboard',
    close: 'Chiudi',
    menu: 'Menu',
    nav: ['Panoramica', 'Link', 'Statistiche', 'Codici QR', 'Impostazioni'],
    admin: 'Amministrazione',
    account: 'Account',
    authenticatedUser: 'Utente autenticato',
    loadingWorkspace: 'Caricamento area di lavoro…',
    loadError: 'Impossibile caricare questa vista.',
    tryAgain: 'Riprova',
    workspace: 'Area di lavoro',
    overview: 'Panoramica',
    overviewLead: 'Gestisci link, codici QR e statistiche dei clic.',
    createLink: 'Crea un link',
    linkSummary: 'Riepilogo link',
    totalLinks: 'Link totali',
    activePage: 'Attivi in questa pagina',
    qrReady: 'QR disponibili',
    recentLinks: 'Link recenti',
    latestLinks: 'I tuoi ultimi link.',
    viewAll: 'Vedi tutti',
    noLinks: 'Nessun link',
    noLinksText:
      'Crea il primo link breve per iniziare a usare la tua area di lavoro.',
    links: {
      eyebrow: 'Gestione',
      pageTitle: 'Link',
      lead: 'Crea e gestisci i link brevi associati al tuo account.',
      createTitle: 'Crea un link breve',
      createLead: 'Sono supportate soltanto destinazioni HTTP e HTTPS.',
      destination: 'URL di destinazione',
      titleOptional: 'Titolo (facoltativo)',
      title: 'Titolo',
      titlePlaceholder: 'Link della campagna',
      expiresOptional: 'Scadenza (facoltativa)',
      expires: 'Scadenza',
      shorten: 'Abbrevia link',
      loading: 'Caricamento link…',
      empty: 'Nessun link associato',
      emptyText:
        'Crea il primo link qui sopra. I link creati dopo l’accesso compariranno qui.',
      yours: 'I tuoi link',
      showing: 'Visualizzati',
      caption: 'Link brevi associati al tuo account',
      urlRequired: 'Inserisci un URL di destinazione.',
      urlLong: 'L’URL di destinazione è troppo lungo.',
      urlProtocol: 'Usa un URL HTTP o HTTPS.',
      urlComplete: 'Inserisci un URL completo, incluso https://.',
      futureExpiration: 'Scegli una data e un’ora future.',
      updateError: 'Impossibile aggiornare il link. Riprova.',
      created: 'Link creato.',
      updated: 'Link aggiornato.',
      deactivated: 'Link disattivato.',
      enabled: 'Link riattivato.',
      deleted: 'Link eliminato.',
      copyUnavailable:
        'La copia non è disponibile. Seleziona il link breve e copialo manualmente.',
      shortCopied: 'Link breve copiato',
      copyShort: 'Copia link breve',
      visitShort: 'Visita link breve',
      qrAction: 'Anteprima e download del codice QR',
      editLink: 'Modifica link',
      disableLink: 'Disattiva link',
      enableLink: 'Riattiva link',
      deleteLink: 'Elimina link',
      editDescription: 'Aggiorna questo link. La scadenza deve essere futura.',
      deleteQuestion: 'Eliminare il link?',
      disableQuestion: 'Disattivare il link?',
      deleteDescription:
        'Il link e l’accesso del proprietario verranno rimossi definitivamente. L’azione non può essere annullata.',
      disableDescription:
        'Il link breve pubblico non reindirizzerà finché non verrà riattivato.',
      downloadQr: 'Scarica codice QR',
      loadingQr: 'Caricamento codice QR…',
      saveChanges: 'Salva modifiche',
      qrDescription: 'Questo codice QR contiene',
      qrAlt: 'Codice QR per',
      downloadSvg: 'Scarica SVG',
    },
    analytics: {
      eyebrow: 'Approfondimenti',
      title: 'Statistiche',
      lead: 'Consulta i clic di un link di tua proprietà alla volta.',
      loading: 'Caricamento statistiche…',
      loadingClicks: 'Caricamento dati sui clic…',
      loadError: 'Impossibile caricare le statistiche.',
      empty: 'Nessuna statistica',
      emptyText:
        'Crea prima un link associato. Le statistiche appariranno dopo le visite.',
      link: 'Link',
      from: 'Da (UTC)',
      to: 'A (UTC)',
      granularity: 'Intervallo',
      hour: 'Ora',
      day: 'Giorno',
      week: 'Settimana',
      apply: 'Applica intervallo',
      refresh: 'Aggiorna',
      invalidRange: 'Scegli un orario UTC iniziale precedente a quello finale.',
      rangeLong: 'L’intervallo non può superare 90 giorni.',
      total: 'Clic totali',
      first: 'Primo clic · UTC',
      last: 'Ultimo clic · UTC',
      series: 'Clic nel tempo',
      noPeriod: 'Nessun clic nel periodo',
      noPeriodText: 'Le visite appariranno dopo l’apertura del link breve.',
      referrers: 'Siti di provenienza',
      referrerLead: 'Principali origini dei referrer registrate.',
      noReferrers: 'Nessun dato sui referrer nel periodo.',
      agents: 'User agent',
      agentsLead: 'Principali user agent registrati.',
      noAgents: 'Nessun dato sugli user agent nel periodo.',
      direct: 'Diretto',
      summary: 'Riepilogo statistiche',
      allUtc: 'Tutte le statistiche usano UTC. Intervallo:',
      rangeTo: 'a',
      buckets: 'intervalli · UTC',
      clicks: 'clic',
      newestPrefix: 'Sono mostrati i',
      newestMiddle: 'link più recenti su',
      newestSuffix: 'totali. Usa Link per gestire l’intero insieme.',
      largePrefix: 'Insieme di dati esteso: sono mostrati i primi',
      largeMiddle: 'intervalli su',
      largeSuffix:
        'totali. Scegli giorno o settimana per una vista completa e compatta.',
    },
    qr: {
      eyebrow: 'Condivisione',
      title: 'Codici QR',
      lead: 'Scarica il codice QR generato per un link breve di tua proprietà.',
      loading: 'Caricamento codici QR…',
      loadError: 'Impossibile caricare il codice QR.',
      empty: 'Nessun codice QR disponibile',
      emptyText:
        'Crea prima un link associato. Ushly genera il codice QR dal link breve pubblico.',
      choose: 'Scegli un link',
      explanation:
        'I codici QR contengono il link breve Ushly. Le statistiche vengono registrate quando quel link viene aperto.',
      download: 'Scarica SVG',
      generating: 'Generazione codice QR…',
      alt: 'Codice QR per',
    },
    settings: {
      eyebrow: 'Account',
      title: 'Impostazioni',
      lead: 'Controlla i metodi di autenticazione collegati al tuo account Ushly.',
      methods: 'Metodi di autenticazione',
      methodsLead: 'Controlla i metodi collegati al tuo account Ushly.',
      email: 'Email dell’account',
      emailFallback: 'Disponibile dopo il prossimo accesso con password',
      google: 'Account Google',
      linked: 'Account Google collegato',
      notLinked: 'Non collegato',
      link: 'Collega account Google',
    },
  },
  admin: {
    eyebrow: 'Amministrazione',
    label: 'Amministrazione',
    global: 'Statistiche globali',
    users: 'Utenti',
    links: 'Link',
    globalLead: 'Consulta l’attività aggregata dei clic nel servizio.',
    usersLead: 'Filtra gli account e controlla se possono autenticarsi.',
    linksLead:
      'Filtra i link del servizio e controlla la disponibilità dei reindirizzamenti.',
    restricted: 'Controlli riservati dell’area di lavoro.',
    required: 'Accesso amministratore richiesto',
    unauthorized:
      'Il tuo account non è autorizzato a visualizzare questi controlli.',
    returnOverview: 'Torna alla panoramica',
    checking: 'Verifica accesso amministratore…',
    loadError: 'Impossibile caricare i dati amministrativi.',
    loadingGlobal: 'Caricamento statistiche globali…',
    summary: 'Riepilogo statistiche globali',
    daily: 'Clic giornalieri',
    globalTotals: 'Totali globali · UTC',
    noClicks: 'Nessun clic nel periodo',
    noClicksText:
      'L’attività globale apparirà dopo la registrazione dei reindirizzamenti.',
    userFilters: 'Filtri utenti',
    searchEmail: 'Cerca per email',
    role: 'Ruolo',
    allRoles: 'Tutti i ruoli',
    administrator: 'Amministratore',
    user: 'Utente',
    allStatuses: 'Tutti gli stati',
    loadingUsers: 'Caricamento utenti…',
    noUsers: 'Nessun utente trovato',
    noUsersText: 'Nessun account corrisponde ai filtri selezionati.',
    enableUser: 'Attiva utente',
    disableUser: 'Disattiva utente',
    userToggleDescription:
      'Modifica la possibilità dell’account di autenticarsi. Il backend resta il confine di autorizzazione.',
    userResults: 'Risultati amministrativi utenti',
    action: 'Azione',
    linkFilters: 'Filtri link',
    searchLinks: 'Cerca link o email proprietario',
    searchPlaceholder: 'URL, codice breve o email proprietario',
    ownerId: 'ID proprietario',
    loadingLinks: 'Caricamento link…',
    noLinks: 'Nessun link trovato',
    noLinksText: 'Nessun link corrisponde ai filtri selezionati.',
    enableLink: 'Riattiva link',
    disableLink: 'Disattiva link',
    linkToggleDescription:
      'Modifica la disponibilità del reindirizzamento pubblico. I controlli di proprietà restano sul backend.',
    linkResults: 'Risultati amministrativi link',
    expires: 'Scadenza',
    userDisabled:
      'Utente disattivato. Il server ha registrato l’azione amministrativa.',
    userEnabled:
      'Utente attivato. Il server ha registrato l’azione amministrativa.',
    linkDisabled:
      'Link disattivato. Il server ha registrato l’azione amministrativa.',
    linkEnabled:
      'Link riattivato. Il server ha registrato l’azione amministrativa.',
    resultsPages: 'Pagine dei risultati amministrativi',
    from: 'Da (UTC)',
    to: 'A (UTC)',
    apply: 'Applica intervallo',
    invalidRange: 'Scegli un orario UTC iniziale precedente a quello finale.',
    rangeLong: 'L’intervallo non può superare 90 giorni.',
    allUtc: 'Tutte le statistiche amministrative usano UTC.',
    totalClicks: 'Clic totali',
    firstClick: 'Primo clic · UTC',
    lastClick: 'Ultimo clic · UTC',
  },
  consent: {
    label: 'Consenso ai cookie',
    closeBanner: 'Chiudi il banner dei cookie',
    title: 'Le tue scelte sulla privacy',
    text: 'Ushly usa cookie essenziali per proteggere le sessioni. Al momento non vengono caricati strumenti facoltativi di analisi o pubblicità. Leggi la',
    and: 'e la',
    plus: 'oltre ai',
    manage: 'Gestisci preferenze',
    reject: 'Rifiuta i non essenziali',
    accept: 'Accetta tutti',
    controls: 'Controlli della privacy',
    settings: 'Impostazioni cookie',
    closeSettings: 'Chiudi impostazioni cookie',
    explanation:
      'I cookie essenziali di sessione restano sempre disponibili. Al momento non è implementato o caricato alcuno strumento facoltativo.',
    essential: 'Essenziali',
    essentialText: 'Autenticazione e sicurezza della sessione',
    always: 'Sempre attivi',
    analytics: 'Analisi facoltative',
    futureProvider: 'Riservato a un futuro fornitore dichiarato',
    advertising: 'Pubblicità',
    save: 'Salva preferenze',
  },
  home: {
    title: 'Abbrevia URL gratis con codici QR e statistiche',
    description:
      'Crea link brevi gratis con Ushly, genera codici QR e consulta statistiche riservate al proprietario del link.',
    eyebrow: 'Un modo più semplice per condividere',
    intro:
      'Crea URL brevi gratuiti, genera codici QR e scopri come vengono utilizzati i tuoi link. Ushly offre statistiche attente alla privacy, gestione dei link, scadenze e condivisione sicura.',
    createAccount: 'Crea un account gratis',
    featuresTitle: 'Tutto ciò che serve per gestire i link condivisi',
    featuresLead:
      'Crea un link breve e usa gli strumenti disponibili per condividerlo e gestirlo.',
    features: [
      {
        kind: 'shorten',
        title: 'Link brevi gratuiti',
        text: 'Trasforma una destinazione HTTP o HTTPS in un link compatto da condividere.',
        benefits: [
          'Nessun account richiesto',
          'Copia il risultato in un passaggio',
          'Reindirizzamento alla destinazione salvata',
        ],
      },
      {
        kind: 'qr',
        title: 'Generazione di codici QR',
        text: 'Crea nel browser un codice QR dal tuo link breve pubblico.',
        benefits: [
          'Disponibile dopo aver abbreviato il link',
          'Download in formato SVG',
          'Nessun account richiesto dalla home',
        ],
      },
      {
        kind: 'analytics',
        title: 'Statistiche attente alla privacy',
        text: 'I proprietari possono consultare le statistiche mentre gli indirizzi IP vengono conservati solo come hash.',
        benefits: [
          'Totali e andamento dei clic',
          'Provenienza e user agent',
          'Nessun indirizzo IP in chiaro',
        ],
      },
      {
        kind: 'lifetime',
        title: 'Scadenza e stato dei link',
        text: 'I proprietari autenticati possono impostare una scadenza, disattivare e riattivare i propri link.',
        benefits: [
          'Data di scadenza facoltativa',
          'Attivazione e disattivazione',
          'I link scaduti o disattivati non reindirizzano',
        ],
      },
    ],
    faqs: [
      {
        question: 'Come funziona un abbreviatore di URL?',
        answer:
          'Ushly salva la destinazione e crea un codice breve. Quando qualcuno apre il link breve viene reindirizzato alla destinazione. Sono accettati URL HTTP e HTTPS fino a 2.048 caratteri.',
      },
      {
        question: 'Posso creare e scaricare un codice QR?',
        answer:
          'Sì. Abbrevia un URL, seleziona QR e scarica l’immagine SVG. Il codice viene generato nel browser e apre il link breve.',
      },
      {
        question: 'Quali statistiche sono disponibili?',
        answer:
          'I proprietari autenticati possono vedere clic totali, andamento nel tempo, provenienza e user agent nella dashboard.',
      },
      {
        question: 'Un link breve può scadere?',
        answer:
          'Sì. Un proprietario autenticato può impostare una data futura. Dopo la scadenza il link non reindirizza più.',
      },
      {
        question: 'Cosa succede quando un link è disattivato?',
        answer:
          'Il link smette di reindirizzare finché il proprietario non lo riattiva. La data di scadenza continua comunque a essere valida.',
      },
      {
        question: 'Qual è la differenza tra uso anonimo e account?',
        answer:
          'Senza account puoi creare link e codici QR. Con un account i nuovi link sono associati a te e puoi gestirli e consultarne le statistiche.',
      },
      {
        question: 'I link brevi sono adatti a contenuti riservati?',
        answer:
          'No. Chiunque conosca il link breve può aprirlo. Non abbreviare destinazioni riservate o URL contenenti credenziali.',
      },
      {
        question: 'Come vengono gestiti i dati dei clic?',
        answer:
          'Ushly conserva un hash unidirezionale dell’indirizzo IP, non l’indirizzo in chiaro, oltre a data, provenienza e uno user agent limitato.',
      },
    ],
    faqTitle: 'Domande frequenti',
    accountTitle: 'Mantieni i tuoi link associati al tuo account',
    accountText:
      'Crea un account per conservare i link e gestirli dalla dashboard.',
    signup: 'Registrati',
    login: 'Accedi',
    exampleLabel: 'Esempio illustrativo di URL',
  },
  form: {
    title: 'Abbrevia il tuo URL',
    lead: 'Incolla una destinazione per creare un link breve.',
    noScript:
      'Abilita JavaScript per abbreviare gli URL. Le informazioni della pagina restano disponibili.',
    aria: 'Abbrevia un URL',
    destination: 'URL di destinazione',
    placeholder: 'https://esempio.it/il-tuo-link-lungo',
    hint: 'Inserisci un URL completo con http:// o https://.',
    shortening: 'Creazione…',
    shorten: 'Abbrevia link',
    creating: 'Creazione del link breve…',
    ready: 'Il link breve è pronto.',
    empty: 'Il link breve apparirà qui sotto.',
    analyticsPrompt: 'Vuoi consultare le statistiche?',
    createAccount: 'Crea un account gratis',
    result: 'Risultato del link breve',
    original: 'URL di destinazione originale',
    visit: 'Visita URL',
    copy: 'Copia',
    copied: 'Copiato',
    copyUnavailable: 'Copia non disponibile',
    qr: 'QR',
    closeQr: 'Chiudi codice QR',
    qrAlt: 'Codice QR del link breve',
    qrGenerating: 'Generazione del codice QR…',
    qrUnavailable: 'Anteprima QR non disponibile.',
    qrTitle: 'Scarica il codice QR',
    qrDescription: 'Generato nel browser a partire dal link breve pubblico.',
    download: 'Scarica codice QR (SVG)',
    downloadReady: 'Download richiesto. Controlla i download del browser.',
    retry: 'Riprova',
    genericError: 'Si è verificato un problema. Riprova.',
    qrError: 'Impossibile generare il codice QR. Riprova.',
    required: 'Inserisci un URL da abbreviare.',
    invalid:
      'Inserisci un URL completo con http:// o https://, fino a 2.048 caratteri.',
  },
  legal: {
    pages: legalPages,
    ui: {
      notice: 'Avviso di revisione prima della pubblicazione',
      noticeText:
        'Modello di progetto: fai revisionare questa pagina e sostituisci i dati configurabili del gestore e di contatto prima della pubblicazione.',
      contents: 'Contenuti',
      sections: 'sezioni',
      related: 'Pagine legali correlate',
      relatedTitle: 'Informazioni correlate',
    },
  },
  public: {
    offers: 'Cosa offre Ushly',
    built: 'Funzioni concrete per i tuoi link',
    practice: 'In pratica',
    how: 'Come funziona',
    faq: 'Domande frequenti',
    next: 'Passaggi successivi',
    pages: {
      '/url-shortener': {
        title: 'Abbrevia URL gratis e crea link brevi da condividere',
        pageTitle: 'Abbrevia URL gratis',
        description:
          'Abbrevia URL gratis con Ushly. Crea un link breve, copialo o genera un codice QR senza account.',
        eyebrow: 'Abbrevia URL',
        lead: 'Trasforma un indirizzo web lungo in un link pubblico compatto. Incolla la destinazione nella home, poi copia o apri il risultato.',
        visual: 'link',
        visualLabel: 'Una destinazione. Un link breve.',
        heroActions: [
          { label: 'Abbrevia un URL', to: '/', style: 'primary' },
          {
            label: 'Scopri le funzionalità',
            to: '/features',
            style: 'secondary',
          },
        ],
        finalCta: {
          title: 'Vuoi capire come vengono usati i tuoi link?',
          text: 'Crea un account per ottenere link associati a te e consultare le statistiche dei clic.',
          actions: [
            { label: 'Inizia gratis', to: '/register', style: 'primary' },
          ],
        },
        highlights: [
          {
            title: 'Crea senza account',
            text: 'Abbrevia URL HTTP e HTTPS fino a 2.048 caratteri.',
          },
          {
            title: 'Condividi il risultato',
            text: 'Copia il link breve o aprilo con l’azione Visita URL.',
          },
          {
            title: 'Aggiungi un codice QR',
            text: 'Crea e scarica un codice QR SVG dallo stesso link breve.',
          },
        ],
        steps: [
          'Incolla un URL HTTP o HTTPS completo.',
          'Seleziona Abbrevia link nella home.',
          'Copia, visita o crea il codice QR del risultato.',
        ],
        faqs: [
          {
            question: 'Posso abbreviare un URL senza accedere?',
            answer:
              'Sì. Puoi creare un link breve dalla home senza account; non verrà associato automaticamente a un account creato in seguito.',
          },
          {
            question: 'Cosa succede quando qualcuno apre il link?',
            answer:
              'Ushly reindirizza alla destinazione salvata finché il link è attivo e non è scaduto.',
          },
        ],
      },
      '/qr-codes': {
        title: 'Generatore gratuito di codici QR per link brevi',
        pageTitle: 'Generatore di codici QR gratuito',
        description:
          'Genera e scarica gratis un codice QR SVG per un link breve Ushly, direttamente nel browser.',
        eyebrow: 'Codici QR',
        lead: 'Dopo aver abbreviato un URL, seleziona QR accanto al nuovo link. Ushly genera il codice nel browser usando il link breve pubblico.',
        visual: 'qr',
        visualLabel: 'Un accesso scansionabile al tuo link breve.',
        heroActions: [
          { label: 'Crea un codice QR', to: '/', style: 'primary' },
        ],
        finalCta: {
          title: 'Ti servono codici QR con statistiche?',
          text: 'Ushly crea codici QR che contengono link brevi. Con un account puoi consultare i clic registrati dal link.',
          actions: [
            { label: 'Inizia gratis', to: '/register', style: 'primary' },
          ],
        },
        highlights: [
          {
            title: 'Generato nel browser',
            text: 'L’immagine viene creata localmente senza chiamare un servizio QR esterno.',
          },
          {
            title: 'Download SVG',
            text: 'Scarica un’immagine vettoriale dal riquadro QR.',
          },
          {
            title: 'Stesso comportamento del link',
            text: 'Scadenza e disattivazione continuano ad applicarsi al link contenuto nel codice.',
          },
        ],
        steps: [
          'Abbrevia una destinazione nella home.',
          'Seleziona QR accanto al risultato.',
          'Scarica l’immagine SVG generata.',
        ],
        faqs: [
          {
            question: 'Che cosa contiene il codice QR?',
            answer:
              'Contiene esattamente il link breve pubblico Ushly mostrato nel risultato, non l’URL di destinazione originale.',
          },
          {
            question: 'Il codice QR funziona se il link viene disattivato?',
            answer:
              'L’immagine resta scansionabile, ma un link breve disattivato o scaduto non reindirizza più.',
          },
          {
            question: 'Che cos’è un codice QR?',
            answer:
              'È un motivo grafico scansionabile che può aprire un URL. Ushly inserisce nell’immagine il link breve pubblico.',
          },
          {
            question: 'Il generatore di codici QR è gratuito?',
            answer:
              'Sì. Dopo aver creato un link breve puoi generare e scaricare il codice QR senza account.',
          },
        ],
      },
      '/analytics': {
        title: 'Statistiche dei clic per i tuoi link brevi',
        pageTitle: 'Statistiche per link brevi',
        description:
          'Consulta clic totali, andamento nel tempo, provenienza e user agent per i link brevi di tua proprietà.',
        eyebrow: 'Statistiche',
        lead: 'Ushly registra i clic sui reindirizzamenti e mostra le statistiche soltanto al proprietario autenticato del link.',
        visual: 'analytics',
        visualLabel: 'Dati sui clic riservati al proprietario.',
        heroActions: [
          { label: 'Inizia', to: '/register', style: 'primary' },
          {
            label: 'Scopri le funzionalità',
            to: '/features',
            style: 'secondary',
          },
        ],
        finalCta: {
          title: 'Crea un account per consultare le statistiche',
          text: 'Registrati per creare link associati al tuo account e visualizzare i dati dei clic nella dashboard.',
          actions: [
            { label: 'Inizia gratis', to: '/register', style: 'primary' },
          ],
        },
        highlights: [
          {
            title: 'Segui l’andamento nel tempo',
            text: 'Visualizza clic totali e serie temporali per il periodo selezionato.',
          },
          {
            title: 'Comprendi la provenienza',
            text: 'Consulta origini dei referrer e user agent limitati.',
          },
          {
            title: 'Tutela la privacy',
            text: 'Gli indirizzi IP sono conservati come hash unidirezionali, non in chiaro.',
          },
        ],
        steps: [
          'Crea un link dopo aver effettuato l’accesso.',
          'Condividilo e lascia che venga visitato.',
          'Apri le statistiche del link nella dashboard.',
        ],
        faqs: [
          {
            question: 'Chi può vedere le statistiche di un link?',
            answer: 'Soltanto il proprietario autenticato di quel link.',
          },
          {
            question: 'Quali dati posso consultare?',
            answer:
              'Clic totali, andamento temporale, origini dei referrer e statistiche sugli user agent disponibili.',
          },
        ],
      },
      '/features': {
        title: 'Funzionalità per creare e gestire link brevi',
        pageTitle: 'Funzionalità per link brevi',
        description:
          'Scopri link brevi, codici QR, statistiche riservate al proprietario, scadenza e controllo dello stato.',
        eyebrow: 'Funzionalità',
        lead: 'Parti da un link breve pubblico e usa codici QR, statistiche e controlli sul ciclo di vita dei link.',
        visual: 'features',
        visualLabel: 'Strumenti essenziali per i tuoi link.',
        heroActions: [
          { label: 'Abbrevia un link', to: '/', style: 'primary' },
          { label: 'Inizia', to: '/register', style: 'secondary' },
        ],
        finalCta: {
          title: 'Ottieni di più dai link che condividi',
          text: 'Registrati per creare link associati al tuo account, gestirli e consultarne le statistiche.',
          actions: [
            { label: 'Inizia gratis', to: '/register', style: 'primary' },
          ],
        },
        highlights: [
          {
            title: 'Link brevi gratuiti',
            text: 'Crea e copia un URL breve dalla home senza account.',
          },
          {
            title: 'Condivisione tramite QR',
            text: 'Genera nel browser un codice QR SVG.',
          },
          {
            title: 'Statistiche riservate',
            text: 'I proprietari autenticati possono consultare i dati dei clic.',
          },
          {
            title: 'Controlli sul ciclo di vita',
            text: 'Imposta scadenze, disattiva e riattiva i link di tua proprietà.',
          },
        ],
        steps: [
          'Crea un URL breve.',
          'Condividilo direttamente o tramite codice QR.',
          'Gestisci stato e statistiche dei link associati al tuo account.',
        ],
        faqs: [
          {
            question: 'Quali funzioni posso usare senza account?',
            answer:
              'Puoi abbreviare URL, copiare il risultato e scaricare codici QR dalla home.',
          },
          {
            question: 'Quali funzioni richiedono un account?',
            answer:
              'Gestione e statistiche richiedono l’autenticazione e la proprietà del link.',
          },
          {
            question: 'Posso impostare una scadenza?',
            answer:
              'Sì. Un proprietario autenticato può impostare una data futura; dopo la scadenza il link non reindirizza.',
          },
          {
            question: 'Posso disattivare e riattivare un link?',
            answer:
              'Sì. Puoi modificare lo stato dei link di tua proprietà dalla dashboard.',
          },
          {
            question: 'I codici QR includono le statistiche?',
            answer:
              'Il codice QR non traccia le scansioni. Contiene un link breve Ushly e i clic su quel link possono comparire nelle statistiche.',
          },
        ],
      },
    },
  },
} as const satisfies EnglishTranslation;
