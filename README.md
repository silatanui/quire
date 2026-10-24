# Quire

Quire is a sketch board that runs in the browser. Draw shapes, arrows, freehand ink, text, and sticky notes on a sheet of paper. The drawing stays in this browser. Nothing here signs you in or stores the board on a server.

Open it at [tanuisila.dev/quire](https://tanuisila.dev/quire).

## Run it locally

The site is static. Serve this folder with any web server and open `index.html`. With XAMPP, put the folder under `htdocs` and visit `http://localhost/quire/`.

```bash
node --test tests/model.test.js
```

## Draw

| Key | Tool |
| --- | --- |
| H | Hand |
| V or 1 | Selection |
| R or 2 | Rectangle |
| D or 3 | Diamond |
| O or 4 | Ellipse |
| A or 5 | Arrow |
| L or 6 | Line |
| P or 7 | Draw |
| T or 8 | Text |
| N | Sticky note |
| E or 0 | Eraser |
| Q | Keep the current tool armed |

Pan with the hand, Space, or the middle mouse button. Ctrl and the wheel zoom at the cursor. Ctrl+Z undoes, Ctrl+Y redoes, and Delete removes the selection.

The menu can open a file, keep a JSON copy, export a picture, pass a snapshot, find words, and change the mood, language, and paper. The style card sets ink, wash, texture, weight, rhythm, wobble, corners, fade, lettering, and stack order.

## Layout

- `index.html` is the page.
- `css/app.css` is the interface.
- `js/main.js` runs the board.
- `js/model.js` holds geometry, hit testing, and the scene file.
- `js/rough.js` draws the sketch strokes. It is [rough.js](https://github.com/rough-stuff/rough) 4.6.6 by Preet Shihn, MIT. See `js/rough.LICENSE`.

A saved file looks like `{ "type": "drawexcal", "version": 1, "elements": [] }`.

## Credit

Quire is an original board. Its behavior was studied from the public whiteboard at [excalidraw.com](https://excalidraw.com/) with [REA](https://github.com/morluto/rea). It does not include that project's source, name, logo, accounts, or live collaboration.
