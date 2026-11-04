# 1.4.2: art still to make (Avi, 1.11 evening)

**2.11: done.** All four desert paintings, Kubi kl_ls*, Robo-Da rt.* loop lines are in the game; 1.4.2 installers rebuilt.


Prepared in the container on 1.11; the Gemini part runs in Avi's Chrome when his PC is on (the method is in CLAUDE.md,
"Card paintings": square children's-book style, then "Create another square image in exactly the same style", shown
in a full-screen overlay and taken with the Chrome tool's zoom, scale 1, trimmed and saved as 512 webp).

Style line for every prompt: "a square children's book illustration in soft colored pencil and watercolor, warm natural
light, gentle and detailed, no people, no text, no letters, no cross shapes. Scene: ..."

## 1. Four desert source cards (torah edition; "מה הפסוק מלמד?" and the album show a coloured strip without them)

Save as `art/sources/<id>.webp`, then `python3 tools/build-source-art.py`, and add a focus to `SRC_FOCUS` (learn/hub) if
the crop needs it.

| id | verse | scene |
|---|---|---|
| shita | אֶתֵּן בַּמִּדְבָּר שִׁטָּה (ישעיהו מא, יט) | a young twisted acacia tree growing alone in a wide Negev desert valley, pale sand and soft hills, a few green leaves catching the morning light |
| shittim | עֲצֵי שִׁטִּים עֹמְדִים (שמות כו, טו) | a grove of tall straight old acacia trees standing upright in a desert wadi, their trunks like pillars, warm evening light |
| mayim | נִבְקְעוּ בַמִּדְבָּר מַיִם (ישעיהו לה, ו) | clear water bursting out between desert rocks and running as a small stream across the dry Arava, a few green plants starting at its edge |
| yesusum | יְשֻׂשׂוּם מִדְבָּר וְצִיָּה (ישעיהו לה, א) | the desert in bloom after rain: sand covered with small wild flowers, white sea lilies in front, soft hills behind |

## 2. The science centre's panels (start screen, tab "המרכז המדעי")

- **חוקרי הטבע:** done in code (1.11): the panel shows all five islands.
- **מעבדת הרובוטים:** the panel was drawn in CSS (a box, a circle, coloured bars) and looked poor. Done in the container
  (1.11): a still of קוּבִּי and the three tools from the lab's opening film (src/robolab/intro.js, frames from
  tools/record-intro.py), `art/robolab/panel.webp` → `ISLAND_ART.robolab` (tools/build-island-art.py). Check it on the
  start screen; if Avi prefers a painting, paint one in Gemini without any figure but the robots.
- **המעבדה של רובו־דע:** the picture is a render of the room. Avi asked for nicer pictures here; a Gemini painting
  ("a round bright science room with a big window over a blue gulf and red mountains, a microscope, a work table with
  little inventions, a cabinet of specimens, an aquarium, plants in pots, no people") can replace it in
  `art/islands/lab.png` (or wherever `ISLAND_ART.lab` comes from) if he likes it better. Ask him first.

## 3. Kubi's voice for the savanna lessons

Four new lessons (src/data/robolab/lessons-savanna.js: ls2-3, ls2-5, ls5-2, ls6-1). Their lines `kl_<id>` are listed by
`node tools/voice/kubi-lines.mjs kubi_lines.json`; record them on the PC with Chatterbox (CLAUDE.md, "His voice") and
pack with `python3 tools/voice/build-kubi-voice.py --update`. Until then the words show without his voice.
