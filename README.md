# G-code Beep Tester

Open a terminal in this folder and run:

```powershell
python -m http.server 4173
```

Then open:

```text
http://127.0.0.1:4173
```

Notes:

- The page plays tones locally with the Web Audio API. No printer connection is involved.
- Click `Play` once to unlock browser audio, then the page will interpret `M300` commands as tones.
- `M300 S880 P200` means 880 Hz for 200 ms, and `G4 P150` means wait 150 ms.
- You can also upload a `.mid` file, choose which tracks to include, and convert them into `M300` plus `G4`.
- Track labels now prefer MIDI instrument-style names so the selection list is easier to scan.
- The speed slider rewrites the G-code in the editor, scaling `M300 P...` and `G4` timing directly.
- Chords are flattened to a single melody line by keeping the highest active note at any moment.
- Unsupported G-code is ignored and listed in the log so you can keep mixed snippets in the editor.
