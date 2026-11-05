(function (root) {
  'use strict';
  // IDs stay stable when copy is edited. Placeholders require a matching context value.
  root.bannerTexts = [
    { id: 'coffee', period: 'morning', text: 'Kaffee zuerst. Film gleich danach.' },
    { id: 'early', period: 'morning', text: 'Dein Sofa hat Frühschicht.' },
    { id: 'late', period: 'night', text: 'Für gute Geschichten ist es nie zu spät.' },
    { id: 'regret', period: 'night', text: 'Morgen bereuen wir das. Heute schauen wir.' },
    { id: 'lights', period: 'evening', text: 'Licht aus. Ansprüche an den Plot hoch.' },
    { id: 'weekend', weekend: true, text: 'Wochenende. Film an. Welt aus.' },
    { id: 'fresh', event: 'new-film', text: 'Frisch im Regal: {filmtitel}. Dein Sofa wurde informiert.' },
    { id: 'balloon', question: 'Warum ist der Luftballon geplatzt?', text: 'Aus Platzgründen.' },
    { id: 'roll', question: 'Warum hat die Klopapierrolle gekündigt?', text: 'Sie hatte die Scheiße satt.' },
    { id: 'ghost', question: 'Warum können Geister so schlecht lügen?', text: 'Weil man sie sofort durchschaut.' },
    { id: 'magnet', question: 'Was sagt ein Magnet zum anderen?', text: 'Ich find dich anziehend.' },
    { id: 'excuse', text: 'Nur noch ein Film. Die Ausrede kennst du ja, {name}.' },
    { id: 'sofa', text: 'Dein Sofa hat dich vermisst. Behauptet es jedenfalls.' },
    { id: 'pause', text: 'Die Realität macht kurz Pause.' }
  ];
}(window));
