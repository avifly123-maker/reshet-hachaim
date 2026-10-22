// רובו־דע presents the parts of the research area (1.3.2). Keys: part ids of src/core/journey.js PARTS, or 'research:<place>'.
// { id: 'research.<key>.<n>', f, k (full nikud), at?, expr? } – short bubbles, one idea each, up to about 15 words.
//   research   the research centre (src/research/hub.js), the first time it opens
export const RESEARCH_GUIDE = {
  research: [
    { id: 'research.intro.1', expr: 'happy', f: 'ברוכים הבאים לחוקרי הטבע!', k: 'בְּרוּכִים הַבָּאִים לְחוֹקְרֵי הַטֶּבַע!' },
    { id: 'research.intro.2', at: '.rs-h-case', f: 'בכל תעלומה משהו בטבע יצא מאיזון. אתם מגלים למה.', k: 'בְּכָל תַּעֲלוּמָה מַשֶּׁהוּ בַּטֶּבַע יָצָא מֵאִזּוּן. אַתֶּם מְגַלִּים לָמָּה.' },
    { id: 'research.intro.3', at: '.rs-h-level', f: 'מתחילים ברמה הקלה, ועולים כשמרגישים מוכנים.', k: 'מַתְחִילִים בָּרָמָה הַקַּלָּה, וְעוֹלִים כְּשֶׁמַּרְגִּישִׁים מוּכָנִים.' },
    { id: 'research.intro.4', at: '.rs-h-tut', expr: 'curious', f: 'פעם ראשונה? כאן נפתור יחד תעלומה, צעד אחר צעד.', k: 'פַּעַם רִאשׁוֹנָה? כָּאן נִפְתֹּר יַחַד תַּעֲלוּמָה, צַעַד אַחַר צַעַד.' },
    { id: 'research.intro.5', at: '.rs-h-help .howto-replay', f: 'בכפתור הזה תמצאו שוב את ההסבר הקצר.', k: 'בַּכַּפְתּוֹר הַזֶּה תִּמְצְאוּ שׁוּב אֶת הַהֶסְבֵּר הַקָּצָר.' },
  ],
};
